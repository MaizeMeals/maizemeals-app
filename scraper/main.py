import requests
from bs4 import BeautifulSoup
import os
import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import cloudscraper

# 1. Setup Supabase Connection
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file")

supabase: Client = create_client(url, key)

def scrape_bursley_live():
    print("🚀 Starting Live Scrape of Bursley...")

    # --- STEP 1: GET DINING HALL ID ---
    # We use the slug because that is stable and matches the URL
    target_slug = "bursley"

    # Fetch the UUID for Bursley from our database
    response = supabase.table('dining_halls').select('id').eq('slug', target_slug).execute()

    if not response.data:
        print(f"❌ Error: Could not find dining hall with slug '{target_slug}'. Did you run the SQL seed script?")
        return

    hall_uuid = response.data[0]['id']
    print(f"✅ Found Dining Hall ID: {hall_uuid}")

    # --- STEP 2: FETCH HTML ---
    target_url = f"https://dining.umich.edu/menus-locations/dining-halls/{target_slug}/"
    scraper = cloudscraper.create_scraper()

    try:
        response = scraper.get(target_url)
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # --- STEP 3: PARSE MENUS ---
    menu_container = soup.find('div', id='mdining-items')
    if not menu_container:
        print("❌ Error: Could not find <div id='mdining-items'>. The page structure might have changed.")
        return

    # U-M structure: <h3>Meal Name</h3> immediately before <div class="courses">
    course_divs = menu_container.find_all('div', class_='courses')

    items_processed = 0

    for course_div in course_divs:
        # 1. Find Meal Name (Breakfast, Lunch, Dinner)
        # It lives in the <h3> tag immediately *before* the content div
        header = course_div.find_previous_sibling('h3')
        raw_meal_name = header.get_text(strip=True) if header else "Unknown"

        # Normalize Meal Name for DB Enum (Breakfast, Brunch, Lunch, Dinner)
        if "Breakfast" in raw_meal_name: meal_name = "Breakfast"
        elif "Brunch" in raw_meal_name: meal_name = "Brunch"
        elif "Lunch" in raw_meal_name: meal_name = "Lunch"
        elif "Dinner" in raw_meal_name: meal_name = "Dinner"
        else:
            print(f"⚠️ Skipping unknown meal type: {raw_meal_name}")
            continue

        print(f"\n📂 Processing Meal: {meal_name}")

        # 2. Find Stations (The logic you requested to be fixed)
        # Inside <div class="courses"> is <ul class="courses_wrapper">
        station_list = course_div.find('ul', class_='courses_wrapper')
        if not station_list: continue

        # Each station is an <li> inside that list
        stations = station_list.find_all('li', recursive=False)

        for station in stations:
            # Station Name is in an <h4>
            station_header = station.find('h4')
            if not station_header: continue

            # 3. Find Items
            # Inside the station <li> is a <ul class="items">
            items_ul = station.find('ul', class_='items')
            if not items_ul: continue

            item_lis = items_ul.find_all('li', recursive=False)

            for item_li in item_lis:
                name_div = item_li.find('div', class_='item-name')
                if not name_div: continue

                item_name = name_div.get_text(strip=True)

                # Extract Traits (Classes)
                traits = []
                nutrition_score = None # Default to None (null in DB)

                classes = item_li.get('class', [])
                for cls in classes:
                    if cls.startswith('trait-'):
                        clean_tag = cls.replace('trait-', '')
                        traits.append(clean_tag)

                        # LOGIC: Extract Score from "mhealthyX" tag
                        if clean_tag.startswith('mhealthy'):
                            try:
                                # "mhealthy5" -> 5
                                nutrition_score = int(clean_tag.replace('mhealthy', ''))
                            except ValueError:
                                pass

                    elif cls.startswith('allergen-'):
                        traits.append(f"contains-{cls.replace('allergen-', '')}")

                # --- STEP 4: UPSERT ITEM ---
                # Check if item exists (to get its ID)
                existing_item = supabase.table('items') \
                    .select('id') \
                    .eq('dining_hall_id', hall_uuid) \
                    .eq('name', item_name) \
                    .execute()

                if existing_item.data:
                    item_id = existing_item.data[0]['id']
                    # OPTIONAL: Update the score if it was missing before
                    supabase.table('items').update({
                        "nutrition_score": nutrition_score,
                        "dietary_tags": traits
                    }).eq('id', item_id).execute()
                else:
                    # Create new item with SCORE and TAGS
                    new_item = supabase.table('items').insert({
                        "dining_hall_id": hall_uuid,
                        "name": item_name,
                        "normalized_name": item_name.lower(),
                        "dietary_tags": traits,
                        "nutrition_score": nutrition_score, # <--- Saving it now!
                        "avg_rating": 0
                    }).execute()
                    item_id = new_item.data[0]['id']

                # --- STEP 5: SCHEDULE EVENT ---
                # Link to Today
                try:
                    supabase.table('menu_events').insert({
                        "item_id": item_id,
                        "dining_hall_id": hall_uuid,
                        "meal": meal_name,
                        "date": datetime.date.today().isoformat()
                    }).execute()
                    print(f"   --> Added: {item_name}")
                    items_processed += 1
                except Exception as e:
                    # Duplicate key error means we already added it today. Safe to ignore.
                    if "duplicate key" not in str(e):
                        print(f"   ⚠️ Error adding event: {e}")

    print(f"\n🎉 Finished! Scraped and scheduled {items_processed} items.")

if __name__ == "__main__":
    scrape_bursley_live()
