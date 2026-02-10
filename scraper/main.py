import time
import argparse
from datetime import datetime, timedelta
from lib.api import fetch_locations, fetch_meal_hours, fetch_menu_data
from lib.db import delete_events_for_date, get_supabase_client, upsert_dining_hall, upsert_items, get_hall_id_map, upsert_operating_hours

def run_scraper(days_ahead=1):
    print(f"🚀 Starting Scrape for next {days_ahead} day(s)...")
    supabase = get_supabase_client()

    # --- PHASE 1: SYNC LOCATIONS ---
    print("--- 1. Syncing Dining Locations ---")
    locations = fetch_locations()
    for loc in locations:
        upsert_dining_hall(supabase, loc)

    hall_map = get_hall_id_map(supabase)
    print(f"✓ Synced {len(hall_map)} locations.")

    # --- PHASE 2: SCRAPE MENUS (Loop through dates) ---
    today = datetime.now()

    for i in range(days_ahead):
        # Calculate the target date
        target_date = today + timedelta(days=i)

        # Format dates
        api_date_str = target_date.strftime("%d-%m-%Y") # API: 09-02-2026
        db_date_str = target_date.strftime("%Y-%m-%d")  # DB: 2026-02-09

        print(f"\n📅 Processing Date: {db_date_str} ({api_date_str})")

        for loc in locations:
            official_id = loc['official_id']
            hall_uuid = hall_map.get(official_id)

            if not hall_uuid:
                # print(f"⚠ Warning: No UUID found for {loc['name']}")
                continue

            # A. Get Open Hours (For ALL locations: Cafes, Markets, Halls)
            schedule = fetch_meal_hours(loc['name'], api_date_str)

            if schedule:
                upsert_operating_hours(supabase, hall_uuid, schedule, db_date_str)
            else:
                # If closed, skip everything else for this location
                continue

            # B. Only fetch specific food items for Dining Halls
            if loc['type'] != 'DINING HALLS':
                continue

            print(f"   Processing Menu: {loc['display_name']}...")

            # Clear old events to prevent duplicates/stale data
            delete_events_for_date(supabase, hall_uuid, db_date_str)

            for event in schedule:
                meal_name = event['meal']
                menu_items = fetch_menu_data(loc['name'], api_date_str, meal_name)

                if menu_items:
                    # Extract Times from ISO string
                    start_iso = event['start_time']
                    end_iso = event['end_time']
                    start_time = start_iso.split('T')[1].split('-')[0]
                    end_time = end_iso.split('T')[1].split('-')[0]

                    event_data = {
                        "meal": meal_name,
                        "date": db_date_str,
                        "start_time": start_time,
                        "end_time": end_time
                    }

                    upsert_items(supabase, menu_items, hall_uuid, event_data)
                    time.sleep(0.5) # Be polite to the API

    print("\n🏁 Scrape Complete!")

if __name__ == "__main__":
    # Create the argument parser
    parser = argparse.ArgumentParser(description="Scrape UMich Dining Menus")

    # Add the --days argument (optional, defaults to 1)
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="Number of days ahead to scrape (default: 1)"
    )

    # Parse args and run
    args = parser.parse_args()
    run_scraper(days_ahead=args.days)
