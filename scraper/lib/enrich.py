"""Attach NetNutrition ingredients, allergens and additive highlights to items.

Runs after the M-Dining menu scrape (``main.py``), never inside it: a
NetNutrition failure can't empty or delay menus.

Load on fss.studentlife.umich.edu is kept small:
- dining halls only;
- only items with no ingredients that weren't checked in ``recheck_days``
  (dishes repeat, so after the first run a night needs few labels);
- one session, sequential requests with a pause, retries with backoff on
  resets, and a hard cap on labels per run.

The site keeps the selected menu in the ASP.NET session, so labels for a
menu are fetched right after selecting that menu.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone

from lib.ingredient_highlights import highlight_ingredients, split_allergens
from lib.netnutrition import (
    NetNutritionClient,
    NetNutritionError,
    find_menu,
    normalize_name,
    parse_child_units,
    parse_menu_items,
    parse_menus,
    parse_nutrition_label,
    parse_units,
)

DINING_HALL_TYPE = "DINING HALLS"
RETRY_BACKOFF_SECONDS = (2, 6)


def unit_for_hall(units: list[dict], hall_name: str) -> dict | None:
    """Map an M-Dining hall ("Bursley Dining Hall") to a NetNutrition unit ("Bursley")."""
    base = normalize_name(hall_name).replace("dining hall", "").strip()
    if not base:
        return None
    by_norm = [(normalize_name(u.get("name")), u) for u in units]
    for norm, unit in by_norm:
        if norm == base:
            return unit
    for norm, unit in by_norm:
        if norm.startswith(base) or base.startswith(norm):
            return unit
    return None


def label_payload(label: dict, now_iso: str) -> dict:
    """Columns written to items for a fetched label."""
    ingredients = (label.get("ingredients") or "").strip() or None
    allergens, notes = split_allergens(label.get("allergens"))
    return {
        "ingredients": ingredients,
        "allergens": allergens,
        "label_notes": notes,
        "nutrition_label": label,
        "ingredient_flags": highlight_ingredients(ingredients),
        "ingredients_checked_at": now_iso,
    }


def _needs_lookup(item: dict, cutoff: datetime) -> bool:
    if (item.get("item_type") or "food") != "food" or item.get("ingredients"):
        return False
    checked = item.get("ingredients_checked_at")
    if not checked:
        return True
    try:
        return datetime.fromisoformat(str(checked).replace("Z", "+00:00")) < cutoff
    except ValueError:
        return True


def wanted_items_by_meal(events: list[dict], cutoff: datetime) -> dict[str, dict[str, list[dict]]]:
    """menu_events rows (with embedded items) -> {meal: {normalized name: [items]}}."""
    wanted: dict[str, dict[str, list[dict]]] = {}
    for event in events:
        item = event.get("items")
        if not item or not _needs_lookup(item, cutoff):
            continue
        by_name = wanted.setdefault(event["meal"], {})
        bucket = by_name.setdefault(normalize_name(item["name"]), [])
        if all(existing["id"] != item["id"] for existing in bucket):
            bucket.append(item)
    return wanted


class _Budget:
    def __init__(self, max_labels: int):
        self.remaining = max_labels

    def take(self) -> bool:
        if self.remaining <= 0:
            return False
        self.remaining -= 1
        return True


def _with_retries(fn, *args):
    for attempt in range(len(RETRY_BACKOFF_SECONDS) + 1):
        try:
            return fn(*args)
        except NetNutritionError:
            if attempt >= len(RETRY_BACKOFF_SECONDS):
                raise
            time.sleep(RETRY_BACKOFF_SECONDS[attempt])
    return None


def _crawl_hall(client, unit, on_date, wanted, budget, log) -> dict[str, dict]:
    """Fetch labels for wanted names at one hall/date. Returns {item_id: label}."""
    found: dict[str, dict] = {}
    remaining = {meal: set(names) for meal, names in wanted.items()}
    panels = _with_retries(client.select_unit, unit["unit_oid"])
    children = parse_child_units(panels.get("childUnitsPanel") or "")
    # Rotating dishes live under "Daily Menu"; try it first.
    children.sort(key=lambda c: 0 if normalize_name(c.get("name")) == "daily menu" else 1)
    if not children:
        children = [None]

    for child in children:
        if not any(remaining.values()):
            break
        if child is None:
            menus = parse_menus(panels.get("menuPanel") or "")
        else:
            menus = parse_menus(_with_retries(client.select_child, child["unit_oid"]))
        for meal, names in remaining.items():
            if not names:
                continue
            menu = find_menu(menus, on_date, meal)
            if menu is None:
                continue
            nn_items = parse_menu_items(_with_retries(client.select_menu, menu["menu_oid"]))
            # Labels must be fetched while this menu is the session's selection.
            for nn_item in nn_items:
                key = normalize_name(nn_item.get("name"))
                if key not in names or not nn_item.get("detail_oid"):
                    continue
                if not budget.take():
                    log("   ⏸️ NetNutrition label budget reached for this run")
                    return found
                try:
                    html = _with_retries(client.fetch_label_html, nn_item["detail_oid"], menu["menu_oid"])
                    label = parse_nutrition_label(html)
                except NetNutritionError as exc:
                    log(f"   ⚠️ label failed for {nn_item.get('name')}: {exc}")
                    continue
                if not label.get("name"):
                    continue
                for db_item in wanted[meal][key]:
                    found[db_item["id"]] = label
                names.discard(key)
                # A dish served at several meals only needs one label.
                for other in remaining.values():
                    other.discard(key)
    return found


def enrich_ingredients(
    supabase,
    days_ahead: int = 1,
    *,
    recheck_days: int = 14,
    max_labels: int = 1500,
    pause_seconds: float = 0.5,
    client_factory=NetNutritionClient,
    today=None,
    dry_run: bool = False,
    log=print,
) -> dict:
    """Enrich items on the next ``days_ahead`` days. Returns a summary dict."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    cutoff = now - timedelta(days=recheck_days)
    start = today or datetime.now().date()
    summary = {"labels": 0, "copied": 0, "checked_missing": 0, "errors": [], "updates": []}
    budget = _Budget(max_labels)

    halls = (
        supabase.table("dining_halls").select("id, name, type").eq("type", DINING_HALL_TYPE).execute().data
        or []
    )
    client = None
    units = None

    def write(item_id: str, payload: dict):
        summary["updates"].append({"id": item_id, **payload})
        if not dry_run:
            supabase.table("items").update(payload).eq("id", item_id).execute()

    for offset in range(days_ahead):
        on_date = start + timedelta(days=offset)
        for hall in halls:
            events = (
                supabase.table("menu_events")
                .select("meal, items(id, name, item_type, ingredients, ingredients_checked_at)")
                .eq("dining_hall_id", hall["id"])
                .eq("date", on_date.isoformat())
                .execute()
                .data
                or []
            )
            wanted = wanted_items_by_meal(events, cutoff)
            if not wanted:
                continue
            all_wanted = {i["id"]: i for names in wanted.values() for items in names.values() for i in items}

            found: dict[str, dict] = {}
            try:
                if client is None:
                    client = client_factory(pause_seconds=pause_seconds)
                    client.open_session()
                    units = parse_units(_with_retries(client.home_html))
                unit = unit_for_hall(units or [], hall["name"])
                if unit is None:
                    log(f"   ⚠️ no NetNutrition unit for {hall['name']}")
                else:
                    found = _crawl_hall(client, unit, on_date, wanted, budget, log)
            except NetNutritionError as exc:
                message = f"NetNutrition {hall['name']} {on_date}: {exc}"
                log(f"   ⚠️ {message}")
                summary["errors"].append(message)

            for item_id, label in found.items():
                write(item_id, label_payload(label, now_iso))
            summary["labels"] += len(found)

            # Same dish name at another hall usually shares the recipe.
            missing = {i: all_wanted[i] for i in all_wanted if i not in found}
            if missing:
                names = sorted({all_wanted[i]["name"] for i in missing})
                donors = {}
                for chunk_start in range(0, len(names), 50):
                    rows = (
                        supabase.table("items")
                        .select("name, ingredients, allergens, label_notes, nutrition_label, ingredient_flags")
                        .in_("name", names[chunk_start:chunk_start + 50])
                        .not_.is_("ingredients", "null")
                        .execute()
                        .data
                        or []
                    )
                    for row in rows:
                        donors.setdefault(normalize_name(row["name"]), row)
                for item_id, item in missing.items():
                    donor = donors.get(normalize_name(item["name"]))
                    if donor:
                        payload = {k: donor[k] for k in ("ingredients", "allergens", "label_notes", "nutrition_label", "ingredient_flags")}
                        payload["ingredients_checked_at"] = now_iso
                        write(item_id, payload)
                        summary["copied"] += 1
                    else:
                        summary["checked_missing"] += 1
                        if not dry_run:
                            supabase.table("items").update({"ingredients_checked_at": now_iso}).eq("id", item_id).execute()
            log(f"   🧾 {hall['name']} {on_date}: {len(found)} labels, {len(all_wanted) - len(found)} not on NetNutrition")

            if budget.remaining <= 0:
                log("   ⏸️ Stopping ingredient enrichment: label budget reached")
                return summary
    return summary
