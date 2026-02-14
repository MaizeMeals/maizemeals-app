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

    # Assumes get_hall_id_map returns {(official_id, type): uuid}
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
            # FIX: Use composite key (official_id, type) to find the unique UUID
            # This distinguishes 'Bursley Dining Hall' (Type B) from 'Blue Market' (Type C)
            lookup_key = (loc['official_id'], loc['type'])
            hall_uuid = hall_map.get(lookup_key)

            if not hall_uuid:
                # print(f"⚠ Warning: No UUID found for {loc['name']} ({loc['type']})")
                continue

            # A. Get Open Hours (For ALL locations: Cafes, Markets, Halls)
            schedule = fetch_meal_hours(loc['name'], api_date_str)

            if schedule:
                upsert_operating_hours(supabase, hall_uuid, schedule, db_date_str)
            else:
                # If closed, skip everything else for this location
                continue

            # B. Processing Menu
            # REMOVED: 'if loc['type'] != 'DINING HALLS': continue'
            # We now want to process everything that has hours.

            print(f"   Processing Menu: {loc['display_name']}...")

            # Clear old events to prevent duplicates/stale data
            delete_events_for_date(supabase, hall_uuid, db_date_str)

            for event in schedule:
                raw_name = event['meal'] # e.g. "OPEN", "24/7 KIOSK", "BREAKFAST"

                # 1. API MAPPING: How do we ask UMich for the food?
                # Cafes hide their food under "LUNCH" regardless of time.
                api_query_meal = raw_name
                if raw_name.upper() in ["OPEN", "24/7 KIOSK"]:
                    api_query_meal = "LUNCH"

                # 2. DB MAPPING: How do we save it to our database?
                # Map non-standard names to "All Day" to satisfy the DB constraint.
                standard_meals = ["BREAKFAST", "BRUNCH", "LUNCH", "DINNER", "LATE NIGHT"]

                if raw_name.upper() in standard_meals:
                    db_meal_name = raw_name # Keep original (e.g. "Dinner")
                else:
                    db_meal_name = "All Day" # Map "Open", "24/7 Kiosk" -> "All Day"

                # Fetch menu using the API name
                menu_items = fetch_menu_data(loc['name'], api_date_str, api_query_meal)

                if menu_items:
                    start_iso = event['start_time']
                    end_iso = event['end_time']
                    start_time = start_iso.split('T')[1].split('-')[0]
                    end_time = end_iso.split('T')[1].split('-')[0]

                    event_data = {
                        "meal": db_meal_name, # Saves as "All Day" (or "Breakfast", etc.)
                        "date": db_date_str,
                        "start_time": start_time,
                        "end_time": end_time
                    }

                    upsert_items(supabase, menu_items, hall_uuid, event_data)
                    time.sleep(0.5)

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
