import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from urllib.parse import urlsplit, urlunsplit

from lib.api import fetch_locations, fetch_meal_hours, fetch_menu_data
from lib.db import (
    delete_events_for_date,
    get_hall_id_map,
    get_supabase_client,
    upsert_dining_hall,
    upsert_items,
    upsert_operating_hours,
)

# OPEN and 24/7 KIOSK are queried as LUNCH and stored as All Day.
_ALL_DAY_API_MEALS = ("OPEN", "24/7 KIOSK")
_STANDARD_MEALS = ("BREAKFAST", "BRUNCH", "LUNCH", "DINNER", "LATE NIGHT")


def menu_refresh_plan(meal_outcomes):
    """Choose whether one location/date menu may be replaced.

    Each outcome is ``(ok, items)``. ``ok`` is True only when that meal
    request succeeded. ``items`` may be empty when the meal loaded and has
    no food. Pass a failed request as ``(False, ...)``.

    Returns:
        "replace": every request succeeded and at least one item came back.
        "keep_failed": any request failed. Do not delete or insert.
        "keep_empty": every request succeeded and the total item count is 0.
            Do not delete.
    """
    outcomes = list(meal_outcomes)
    if any(not ok for ok, _items in outcomes):
        return "keep_failed"
    total_items = sum(len(items or []) for _ok, items in outcomes)
    if total_items == 0:
        return "keep_empty"
    return "replace"


def _meal_names(raw_name):
    """Map a schedule label to the M-Dining query and the stored meal name."""
    upper = (raw_name or "").upper()
    api_query_meal = "LUNCH" if upper in _ALL_DAY_API_MEALS else raw_name
    db_meal_name = raw_name if upper in _STANDARD_MEALS else "All Day"
    return api_query_meal, db_meal_name


def _clock_time(iso_timestamp):
    """Return HH:MM:SS from an ISO timestamp that may include a negative offset."""
    return iso_timestamp.split("T")[1].split("-")[0]


def _redact(value):
    """Strip known secrets so logs and alerts never include them."""
    text = value if isinstance(value, str) else f"{type(value).__name__}: {value}"
    for name in ("DISCORD_WEBHOOK_URL", "MDINING_API_KEY", "SUPABASE_KEY", "SUPABASE_URL"):
        secret = os.environ.get(name)
        if secret:
            text = text.replace(secret, "[redacted]")
    return text[:500]


def build_failure_summary(saved_item_count, location_errors):
    lines = [
        "MaizeMeals scraper failed.",
        f"Items saved: {saved_item_count}.",
    ]
    if location_errors:
        lines.append(f"Problems ({len(location_errors)}):")
        for error in location_errors[:12]:
            lines.append(f"- {error}")
        extra = len(location_errors) - 12
        if extra > 0:
            lines.append(f"- and {extra} more")
    else:
        lines.append("No menu items were saved.")
    return "\n".join(lines)[:1800]


def post_failure_alert(summary):
    """POST a short failure summary to DISCORD_WEBHOOK_URL when that env var is set.

    The webhook is optional. A missing URL is logged by name and ignored.
    A failed POST is logged without the webhook URL and does not raise.
    """
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        print("⚠️ Scraper failed and DISCORD_WEBHOOK_URL is unset; not sending an alert.")
        return

    payload = json.dumps({"content": summary}).encode("utf-8")
    request = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "MaizeMealsScraper/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
        print("Posted scraper failure alert.")
    except Exception as exc:
        print(f"⚠️ Discord failure alert could not be delivered: {_redact(exc)}")


def finish_run(saved_item_count, location_errors):
    """Return 0 only when items were saved and no location errored.

    Otherwise POST a summary when DISCORD_WEBHOOK_URL is set and return 1.
    A clean run does not POST. Any saved menus drop the day-menu cache.
    """
    if saved_item_count > 0:
        revalidate_day_menu()
    if saved_item_count > 0 and not location_errors:
        print("\n🏁 Scrape Complete!")
        return 0

    summary = build_failure_summary(saved_item_count, location_errors)
    print(f"\n❌ {summary}")
    post_failure_alert(summary)
    return 1


def _location_label(loc):
    return loc.get("display_name") or loc.get("name") or "unknown location"


def _fetch_meals_for_schedule(loc, api_date_str, schedule):
    """Fetch every meal for one open location and hold the results.

    A failed request is stored as ``ok=False``. That is different from a
    meal that loaded with zero items. Later meals are still fetched so the
    delete decision is made only after this location/date is fully read.
    """
    meals = []
    for event in schedule:
        raw_name = event.get("meal", "")
        api_query_meal, db_meal_name = _meal_names(raw_name)
        try:
            items = fetch_menu_data(loc["name"], api_date_str, api_query_meal)
            start_time = _clock_time(event["start_time"])
            end_time = _clock_time(event["end_time"])
        except Exception as exc:
            meals.append({
                "ok": False,
                "items": [],
                "db_meal_name": db_meal_name,
                "error": _redact(exc),
            })
            continue
        meals.append({
            "ok": True,
            "items": items or [],
            "db_meal_name": db_meal_name,
            "start_time": start_time,
            "end_time": end_time,
        })
    return meals


def _replace_menu(supabase, hall_uuid, db_date_str, meals, location_errors, label):
    """Delete the day's events once, then insert meals that returned items.

    Returns how many item rows upsert_items reported as saved.
    """
    delete_events_for_date(supabase, hall_uuid, db_date_str)
    saved_item_count = 0
    for meal in meals:
        items = meal["items"]
        if not items:
            continue
        event_data = {
            "meal": meal["db_meal_name"],
            "date": db_date_str,
            "start_time": meal["start_time"],
            "end_time": meal["end_time"],
        }
        saved = upsert_items(supabase, items, hall_uuid, event_data) or 0
        if saved <= 0:
            location_errors.append(
                f"{label} on {db_date_str}: {meal['db_meal_name']} was not saved"
            )
        else:
            saved_item_count += saved
        time.sleep(0.5)
    return saved_item_count


def _scrape_location(supabase, loc, hall_uuid, api_date_str, db_date_str, location_errors):
    """Update hours, then replace menu events only when the new menu is usable.

    Hours upserts are kept when the menu is left in place. Returns the
    number of menu item rows saved for this location and date.
    """
    label = _location_label(loc)
    try:
        schedule = fetch_meal_hours(loc["name"], api_date_str)
    except Exception as exc:
        message = (
            f"{label} on {db_date_str}: hours request failed ({_redact(exc)}); "
            "kept existing menu"
        )
        print(f"   ⚠️ Warning: {message}")
        location_errors.append(message)
        return 0

    if not schedule:
        return 0

    upsert_operating_hours(supabase, hall_uuid, schedule, db_date_str)
    print(f"   Processing Menu: {label}...")

    meals = _fetch_meals_for_schedule(loc, api_date_str, schedule)
    plan = menu_refresh_plan((meal["ok"], meal["items"]) for meal in meals)

    if plan == "keep_failed":
        failed = [meal for meal in meals if not meal["ok"]]
        detail = "; ".join(
            f"{meal['db_meal_name']}: {meal.get('error')}" for meal in failed
        )
        message = (
            f"{label} on {db_date_str}: meal request failed ({detail}); "
            "kept existing menu"
        )
        print(f"   ⚠️ Warning: {message}")
        location_errors.append(message)
        return 0

    if plan == "keep_empty":
        print(
            f"   ⚠️ Warning: {label} on {db_date_str}: "
            "all meals returned 0 items; kept existing menu"
        )
        return 0

    return _replace_menu(
        supabase, hall_uuid, db_date_str, meals, location_errors, label
    )


def revalidate_day_menu():
    # WEB_REVALIDATE_URL is optional, e.g. https://host/api/revalidate.
    url = (os.environ.get("WEB_REVALIDATE_URL") or "").strip()
    if not url:
        return

    secret = (os.environ.get("CRON_SECRET") or "").strip()
    if not secret:
        print("⚠ Warning: CRON_SECRET is not set; skipping day-menu cache revalidation.")
        return

    parts = urlsplit(url)
    logged_url = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
    try:
        request = urllib.request.Request(
            url,
            data=b"",
            method="POST",
            headers={"Authorization": "Bearer " + secret},
        )
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.HTTPError as err:
        print(f"⚠ Warning: day-menu cache revalidate failed ({err.code}) for {logged_url}")
    except Exception:
        print(f"⚠ Warning: day-menu cache revalidate failed for {logged_url}")

def run_scraper(days_ahead=1):
    print(f"🚀 Starting Scrape for next {days_ahead} day(s)...")
    # Saved-item count for this run: the sum of row counts reported by the
    # items-table upsert (upsert_items' return value), not the raw menu
    # length before name dedupe.
    saved_item_count = 0
    location_errors = []

    try:
        supabase = get_supabase_client()

        print("--- 1. Syncing Dining Locations ---")
        locations = fetch_locations()
        for loc in locations:
            upsert_dining_hall(supabase, loc)

        hall_map = get_hall_id_map(supabase)
        print(f"✓ Synced {len(hall_map)} locations.")

        today = datetime.now()
        for i in range(days_ahead):
            target_date = today + timedelta(days=i)
            # API dates are DD-MM-YYYY. 09-02-2026 is 9 February 2026.
            api_date_str = target_date.strftime("%d-%m-%Y")
            db_date_str = target_date.strftime("%Y-%m-%d")
            print(f"\n📅 Processing Date: {db_date_str} ({api_date_str})")

            for loc in locations:
                lookup_key = (loc["official_id"], loc["type"])
                hall_uuid = hall_map.get(lookup_key)
                if not hall_uuid:
                    continue
                try:
                    saved_item_count += _scrape_location(
                        supabase,
                        loc,
                        hall_uuid,
                        api_date_str,
                        db_date_str,
                        location_errors,
                    )
                except Exception as exc:
                    message = (
                        f"{_location_label(loc)} on {db_date_str}: "
                        f"{_redact(exc)}; kept existing menu"
                    )
                    print(f"   ⚠️ Warning: {message}")
                    location_errors.append(message)
    except Exception as exc:
        message = f"Scraper error: {_redact(exc)}"
        print(f"❌ {message}")
        location_errors.append(message)

    return finish_run(saved_item_count, location_errors)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape UMich Dining Menus")
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="Number of days ahead to scrape (default: 1)",
    )
    args = parser.parse_args()
    sys.exit(run_scraper(days_ahead=args.days))
