"""Pull a NetNutrition meal and print the parsed labels as JSON.

The M-Dining API remains the source for the fields the database stores.
This script adds the label the API does not have: the full nutrient table,
the ingredients paragraph, and the Contains line. Nothing here is written
to Supabase. Pass --with-api to attach those labels onto a live API pull
when MDINING_API_KEY and MDINING_BASE_URL are set.

Examples, from the scraper directory:

    python3 fetch_nutrition.py --unit "Wolverine Village" --child "Daily Menu" \\
        --date 2026-11-17 --meal Lunch --item "Alfredo Sauce"

    python3 fetch_nutrition.py --unit "Bursley" --date 2026-11-18 --meal Dinner
"""

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

SCRAPER_ROOT = Path(__file__).resolve().parent
if str(SCRAPER_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRAPER_ROOT))

from lib.netnutrition import (  # noqa: E402
    NetNutritionClient,
    NetNutritionError,
    augment_api_items,
    load_nutrition,
)


def _api_items(unit_name, on_date, meal):
    day = date.fromisoformat(on_date)
    try:
        from lib.api import fetch_menu_data
    except ValueError as exc:
        raise NetNutritionError(f"M-Dining API is not configured: {exc}") from exc
    return fetch_menu_data(unit_name, day.strftime("%d-%m-%Y"), meal.strip().upper())


def build_payload(bundles, api_items):
    nutrition_items = [item for bundle in bundles for item in bundle["items"]]
    payload = {
        "source": "netnutrition",
        "persisted": False,
        "fetched_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "bundles": bundles,
        "api_augmentation": None,
    }
    if api_items is None:
        return payload
    augmented = augment_api_items(api_items, nutrition_items)
    matched = sum(1 for item in augmented if item.get("nutrition_label"))
    payload["api_augmentation"] = {
        "items": len(augmented),
        "matched": matched,
        "unmatched": len(augmented) - matched,
        "items_data": augmented,
    }
    return payload


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unit", required=True, help="NetNutrition location name")
    parser.add_argument("--date", required=True, help="Menu date, YYYY-MM-DD")
    parser.add_argument("--meal", required=True, help="Breakfast, Lunch, Dinner, or Brunch")
    parser.add_argument("--child", help="Child menu, such as Daily Menu")
    parser.add_argument("--item", help="Fetch the label for this item name only")
    parser.add_argument("--pause", type=float, default=0.3, help="Seconds between requests")
    parser.add_argument(
        "--with-api",
        action="store_true",
        help="Also pull the M-Dining API menu and attach matching labels",
    )
    args = parser.parse_args(argv)
    try:
        date.fromisoformat(args.date)
    except ValueError:
        parser.error("--date must be YYYY-MM-DD")

    client = NetNutritionClient(pause_seconds=args.pause)
    try:
        bundles = load_nutrition(
            client,
            args.unit,
            args.date,
            args.meal,
            child_name=args.child,
            item_name=args.item,
            on_label=lambda name: print(f"label: {name}", file=sys.stderr),
        )
        api_items = _api_items(args.unit, args.date, args.meal) if args.with_api else None
    except NetNutritionError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    payload = build_payload(bundles, api_items)
    item_count = sum(len(bundle["items"]) for bundle in bundles)
    labeled = sum(
        1 for bundle in bundles for item in bundle["items"] if item.get("nutrition_label")
    )
    print(
        f"{item_count} item(s), {labeled} label(s). Not written to the database.",
        file=sys.stderr,
    )
    json.dump(payload, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
