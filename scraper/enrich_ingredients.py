"""Backfill or re-run NetNutrition ingredients/allergens for menu items.

    python3 enrich_ingredients.py --days 7            # write to Supabase
    python3 enrich_ingredients.py --days 1 --dry-run  # print, don't write

Normally this runs as step 3 of main.py; use this for a first backfill or
after changing the highlight rules (with --recheck-days 0 to redo misses).
"""

import argparse
import json
import sys

from lib.db import get_supabase_client
from lib.enrich import enrich_ingredients


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--max-labels", type=int, default=1500)
    parser.add_argument("--recheck-days", type=int, default=14)
    parser.add_argument("--pause", type=float, default=0.5, help="seconds between NetNutrition requests")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json-out", help="write the computed updates to this file")
    args = parser.parse_args()

    summary = enrich_ingredients(
        get_supabase_client(),
        days_ahead=args.days,
        recheck_days=args.recheck_days,
        max_labels=args.max_labels,
        pause_seconds=args.pause,
        dry_run=args.dry_run,
    )
    print(
        f"labels={summary['labels']} copied={summary['copied']} "
        f"not_listed={summary['checked_missing']} errors={len(summary['errors'])}"
    )
    if args.json_out:
        with open(args.json_out, "w") as fh:
            json.dump(summary["updates"], fh)
    return 0


if __name__ == "__main__":
    sys.exit(main())
