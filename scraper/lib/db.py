import os
import re
from supabase import create_client, Client

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY")
    return create_client(url, key)

def get_hall_id_map(client):
    """
    Returns a dictionary mapping (official_id, type) -> internal uuid.
    Example: { (1000555, 'B'): "d3cfa560-...", (1000555, 'C'): "a1b2c3d4-..." }
    """
    # FIX: Select 'type' so we can distinguish between Dining Hall (B) and Market (C)
    res = client.table("dining_halls").select("id, official_id, type").execute()

    # Return a dict with a TUPLE as the key
    return {(row['official_id'], row['type']): row['id'] for row in res.data}

def delete_events_for_date(client, hall_uuid, date_str):
    """
    Deletes all menu events for a specific hall and date to prevent duplicates.
    date_str should be 'YYYY-MM-DD'
    """
    try:
        client.table("menu_events").delete().match({
            "dining_hall_id": hall_uuid,
            "date": date_str
        }).execute()
        print(f"   🧹 Cleared old events for {date_str}")
    except Exception as e:
        print(f"   ⚠️ Error clearing events: {e}")

def upsert_dining_hall(client, loc_data):
    try:
        # FIX 1: Add on_conflict for 'name' too if official_id is missing,
        # but primarily rely on official_id.
        # Ideally, ensure your DB has a unique constraint on official_id.
        data = client.table("dining_halls").upsert(
            {
                "official_id": loc_data['official_id'],
                "name": loc_data['name'],
                # ... rest of fields ...
                "slug": loc_data['slug'],
                "display_name": loc_data['display_name'],
                "type": loc_data['type'],
                "latitude": loc_data['latitude'],
                "longitude": loc_data['longitude'],
                "address": loc_data['address'],
                "phone": loc_data['phone'],
                "email": loc_data['email']
            },
            on_conflict="official_id, type"
        ).execute()
        return data
    except Exception as e:
        # Log the error but don't crash the script
        print(f"❌ Error upserting hall {loc_data['name']}: {e}")

def upsert_items(client, items, hall_uuid, meal_event_data):
    """Insert items and the menu events that point at them.

    Returns the number of item rows reported by the items-table upsert,
    after items have been deduped by name. The scraper adds these return
    values to get the run's saved-item count. Returns 0 when there is
    nothing to save or the write fails.
    """
    if not items:
        return 0

    # FIX 2: Deduplicate Items List
    unique_items_map = {}

    for item in items:
        # Keep the parser's classification so title rows never become loggable foods.
        i_type = item.get('item_type', 'food')

        # --- NEW FIX: Deduplicate Tags Here ---
        # 1. Get tags (default to empty list if missing)
        raw_tags = item.get('dietary_tags', [])
        # 2. Convert to set to remove duplicates, then back to list
        # 3. Sort them so ["vegan", "halal"] is always stored in the same order
        clean_tags = sorted(list(set(raw_tags)))

        unique_items_map[item['name']] = {
            "dining_hall_id": hall_uuid,
            "name": item['name'],
            "normalized_name": item['name'].lower().strip(),
            "nutrition_score": item.get('nutrition_score'),
            "station": item['station'],
            "macronutrients": item['macronutrients'],
            "is_mhealthy": item['is_mhealthy'],
            "dietary_tags": clean_tags,  # 👈 Usage of cleaned tags
            "serving_size": item['serving_size'],
            "item_type": i_type
        }

    # Convert back to list
    items_payload = list(unique_items_map.values())

    try:
        # 1. Upsert Items
        item_res = client.table("items").upsert(
            items_payload,
            on_conflict="dining_hall_id, name"
        ).execute()

        # Check if data was returned
        if not item_res.data:
            print(f"   ⚠️ No data returned from upsert for {meal_event_data['meal']}")
            return 0

        saved_items = item_res.data

        # FIX 3: Fix Case Sensitivity for Meal Name
        meal_name = meal_event_data['meal'].title()

        events_payload = []
        for saved_item in saved_items:
            events_payload.append({
                "dining_hall_id": hall_uuid,
                "item_id": saved_item['id'],
                "meal": meal_name,
                "date": meal_event_data['date'],
                "start_time": meal_event_data['start_time'],
                "end_time": meal_event_data['end_time']
            })

        # 2. Upsert Events
        client.table("menu_events").upsert(
            events_payload,
            on_conflict="item_id, date, meal"
        ).execute()

        print(f"   ✅ Saved {len(saved_items)} items for {meal_name}")
        return len(saved_items)

    except Exception as e:
        print(f"   ❌ Error saving items: {e}")
        return 0

def upsert_operating_hours(client, hall_uuid, schedule, date_str):
    """
    Replaces a location's shifts for one date.

    Keeps split shifts (e.g. Lunch 11-1 and Lunch 2-4). Rows are replaced
    (delete + insert) so a shift that moved or disappeared doesn't linger.

    Compatibility: before migration 20261118200425_split_shift_hours,
    operating_hours is unique on (hall, date, event_name). In that case the
    insert of split shifts fails with 23505 and we fall back to one row per
    shift name (the old behaviour), so this works before and after the
    migration.
    """
    if not schedule:
        return

    def to_time(iso):
        return iso.split('T')[1].split('-')[0].split('+')[0].replace('Z', '')

    rows = {}
    for event in schedule:
        start_t = to_time(event['start_time'])
        end_t = to_time(event['end_time'])
        event_name = event['meal'].title()  # "Lunch", "Open", "Standard"
        rows[(event_name, start_t)] = {
            "dining_hall_id": hall_uuid,
            "date": date_str,
            "event_name": event_name,
            "start_time": start_t,
            "end_time": end_t,
        }
    payload = sorted(rows.values(), key=lambda r: r["start_time"])

    try:
        client.table("operating_hours").delete().match({
            "dining_hall_id": hall_uuid,
            "date": date_str,
        }).execute()
    except Exception as e:
        print(f"   ❌ Error clearing hours: {e}")
        return

    try:
        client.table("operating_hours").insert(payload).execute()
        print(f"   🕒 Saved hours for {len(payload)} shifts")
        return
    except Exception as e:
        if "23505" not in str(e):
            print(f"   ❌ Error saving hours: {e}")
            return

    # Old unique constraint: keep the last shift per name.
    by_name = {}
    for row in payload:
        by_name[row["event_name"]] = row
    try:
        client.table("operating_hours").insert(list(by_name.values())).execute()
        print(f"   🕒 Saved hours for {len(by_name)} shifts (split shifts merged — old unique constraint)")
    except Exception as e:
        print(f"   ❌ Error saving hours: {e}")
