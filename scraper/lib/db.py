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
    Returns a dictionary mapping official_id (int) -> internal uuid (str).
    Example: { 1000555: "d3cfa560-..." }
    """
    res = client.table("dining_halls").select("id, official_id").execute()
    return {row['official_id']: row['id'] for row in res.data}

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
            on_conflict="official_id"
        ).execute()
        return data
    except Exception as e:
        # Log the error but don't crash the script
        print(f"❌ Error upserting hall {loc_data['name']}: {e}")

def upsert_items(client, items, hall_uuid, meal_event_data):
    if not items:
        return

    # FIX 2: Deduplicate Items List
    # We use a dictionary keyed by Item Name to ensure we only send unique items per batch.
    unique_items_map = {}

    for item in items:
        # Determine type (Food vs Header)
        i_type = 'station_header' if (not item['macronutrients'] and item['serving_size'] == 'TITLE') else 'food'

        # Store in map (last writer wins, which is fine for duplicates)
        unique_items_map[item['name']] = {
            "dining_hall_id": hall_uuid,
            "name": item['name'],
            "normalized_name": item['name'].lower().strip(),
            "nutrition_score": item.get('nutrition_score'),
            "station": item['station'],
            "macronutrients": item['macronutrients'],
            "is_mhealthy": item['is_mhealthy'],
            "dietary_tags": item['dietary_tags'],
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

        saved_items = item_res.data

        # FIX 3: Fix Case Sensitivity for Meal Name
        # API says "BREAKFAST", DB wants "Breakfast"
        meal_name = meal_event_data['meal'].title() # "LUNCH" -> "Lunch"

        # Just in case: Handle "Light Lunch" or "Late Night" if your DB supports them
        # If your constraint is strict, you might need to map them manually.

        events_payload = []
        for saved_item in saved_items:
            events_payload.append({
                "dining_hall_id": hall_uuid,
                "item_id": saved_item['id'],
                "meal": meal_name,                 # 👈 Using Title Case
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

    except Exception as e:
        print(f"   ❌ Error saving items: {e}")

def upsert_operating_hours(client, hall_uuid, schedule, date_str):
    """
    Saves the opening/closing times for a location.
    Deduplicates events to prevent 'ON CONFLICT' batch errors.
    """
    if not schedule:
        return

    # 1. Deduplicate using a dictionary
    # Key = event_name (e.g., "Lunch")
    # Value = The data payload
    unique_map = {}

    for event in schedule:
        # Extract HH:MM:SS
        start_t = event['start_time'].split('T')[1].split('-')[0]
        end_t = event['end_time'].split('T')[1].split('-')[0]

        event_name = event['meal'].title() # "Lunch", "Open", "Standard"

        # If a location has split hours (e.g. Lunch 11-1 and Lunch 2-4),
        # we strictly only keep the LAST one found to satisfy the Unique Constraint.
        # Ideally, the API returns distinct names, but this prevents the crash.
        unique_map[event_name] = {
            "dining_hall_id": hall_uuid,
            "date": date_str,
            "event_name": event_name,
            "start_time": start_t,
            "end_time": end_t
        }

    # 2. Convert back to list
    payload = list(unique_map.values())

    try:
        client.table("operating_hours").upsert(
            payload,
            on_conflict="dining_hall_id, date, event_name"
        ).execute()
        print(f"   🕒 Saved hours for {len(payload)} shifts")
    except Exception as e:
        print(f"   ❌ Error saving hours: {e}")
