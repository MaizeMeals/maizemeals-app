import os
import cloudscraper
import re
from pathlib import Path
from urllib.parse import urljoin
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / '.env'

load_dotenv(dotenv_path=env_path)
# Fetch secrets
API_KEY = os.environ.get("MDINING_API_KEY")
BASE_URL = os.environ.get("MDINING_BASE_URL")

# Validate secrets exist
if not API_KEY or not BASE_URL:
    raise ValueError("Missing API_KEY or BASE_URL in environment variables.")

assert(API_KEY)
assert(BASE_URL)

# Initialize Scraper
scraper = cloudscraper.create_scraper()

def fetch_locations():
    """
    Fetches the list of all dining locations (Halls, Cafes, Markets).

    Returns:
        list: A list of dictionaries containing location metadata.
    """
    endpoint = urljoin(BASE_URL, "dining/locations")

    params = {
        "key": API_KEY
    }

    print("Fetching location list...")

    try:
        response = scraper.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return []

    parsed_locations = []

    for loc in data:
        # 1. Basic Validation
        # If it doesn't have a name, we can't scrape its menu later.
        if not loc.get('name') or not loc.get('officialbuildingid'):
            continue

        # 2. Format Address
        addr = loc.get('address', {})
        # Result: "1931 Duffield, Ann Arbor, MI 48109"
        full_address = f"{addr.get('street1', '')}, {addr.get('city', '')}, {addr.get('state', '')} {addr.get('postalCode', '')}".strip()
        # Clean up double spaces or trailing commas if data is messy
        full_address = re.sub(r'\s+', ' ', full_address).strip(' ,')

        # 3. Structure Data
        parsed_locations.append({
            "name": loc.get('name'),               # Used for API Queries (e.g., "Bursley Dining Hall")
            "slug": loc.get('name').lower().replace(' ', '-'), # Internal URL slug
            "official_id": loc.get('officialbuildingid'),
            "display_name": loc.get('displayName'), # Pretty name (e.g., "Blue Market - Bursley")
            "type": loc.get('campus'),              # "DINING HALLS", "CAFES", "MARKETS"
            "latitude": loc.get('lat'),
            "longitude": loc.get('lng'),
            "address": full_address,
            "image_url": loc.get('image'),          # e.g., "dining-bursley.jpg"
            "phone": loc.get('contact', {}).get('phone'),
            "email": loc.get('contact', {}).get('email')
        })

    return parsed_locations

def fetch_meal_hours(location_name: str, date_str: str):
    """
    Fetches the opening/closing times for a specific hall and date.

    Args:
        location_name (str): e.g., "Twigs At Oxford"
        date_str (str): Format "MM-DD-YYYY" (e.g., "09-02-2026")

    Returns:
        list: A list of dicts with meal times, e.g.:
              [{'meal': 'Breakfast', 'start': '2026-02-09T07:00:00-05:00', 'end': '...'}]
    """
    endpoint = urljoin(BASE_URL, "dining/meal-hours")

    params = {
        "key": API_KEY,
        "location": location_name,
        "date": date_str
    }

    print(f"Fetching hours for {location_name} on {date_str}...")

    try:
        response = scraper.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error fetching hours: {e}")
        return []

    # The 'hours' array contains the specific timestamps for open slots
    raw_hours = data.get('hours', [])
    schedule = []

    for event in raw_hours:
        # 1. Get the meal name (e.g., "Breakfast")
        meal_name = event.get('event_title', '').strip()

        # 2. Get the ISO timestamps (e.g., "2026-02-09T07:00:00-05:00")
        start_iso = event.get('event_time_start')
        end_iso = event.get('event_time_end')

        if meal_name and start_iso and end_iso:
            schedule.append({
                "meal": meal_name.upper(), # Normalize to uppercase like 'BREAKFAST'
                "start_time": start_iso,
                "end_time": end_iso
            })

    return schedule

def fetch_menu_data(location_name: str, date_str: str, meal_name: str):
    """
    Fetches and parses menu data for a specific hall, date, and meal.

    Args:
        location_name (str): e.g., "Bursley Dining Hall"
        date_str (str): Format "DD-MM-YYYY" (e.g., "09-02-2026")
        meal_name (str): "BREAKFAST", "BRUNCH", "LUNCH", "DINNER"

    Returns:
        list: A list of parsed item dictionaries ready for processing.
    """

    # 1. Construct the Full URL correctly
    # BASE_URL is "https://.../". We need to append "dining/menu"
    endpoint = urljoin(BASE_URL, "dining/menu")

    params = {
        "key": API_KEY,
        "location": location_name,
        "date": date_str,
        "meal": meal_name
    }

    print(f"Fetching {meal_name} for {location_name} on {date_str}...")

    try:
        response = scraper.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

    # If the hall is closed or data is missing, 'menu' might be null or missing
    if not data.get('menu'):
        print(f"No menu found for {location_name} - {meal_name}")
        return []

    parsed_items = []

    # Iterate through Stations (e.g., "Hot Cereal", "Grill Station")
    categories = data['menu'].get('category', [])
    if isinstance(categories, dict): # Handle edge case where single category isn't a list
        categories = [categories]

    for station in categories:
        station_name = station.get('name', 'General')
        menu_items = station.get('menuItem', [])

        if not isinstance(menu_items, list):
            menu_items = [menu_items]

        for item in menu_items:
            # --- 1. CLEAN DATA ---
            name = item.get('name', '').strip()

            if "no service at this time" in name.lower():
                continue

            # Extract Attributes (Dietary Tags + MHealthy)
            raw_attributes = item.get('attribute', [])
            dietary_tags = []
            is_mhealthy = False
            m_score = None  # <--- New Variable

            for attr in raw_attributes:
                # Check for M-Healthy tag (e.g., "mhealthy2")
                if 'mhealthy' in attr.lower():
                    is_mhealthy = True
                    # Extract the number (1-6)
                    match = re.search(r'(\d+)', attr)
                    if match:
                        m_score = int(match.group(1))
                else:
                    dietary_tags.append(attr)

            for attr in raw_attributes:
                # Check for M-Healthy flag (mhealthy1, mhealthy2, etc.)
                if 'mhealthy' in attr.lower():
                    is_mhealthy = True
                else:
                    dietary_tags.append(attr)

            # Extract Serving Size
            item_sizes = item.get('itemSizes', {})
            serving_size = item_sizes.get('serving_size', '')

            # --- 2. PARSE NUTRITION ---
            # Convert the list [{"name": "Calories", "value": "15kcal"}]
            # into a clean dict {"Calories": 15, "Protein": 0}
            nutrition_list = item_sizes.get('nutrition', [])
            macros = {}

            for nut in nutrition_list:
                n_name = nut.get('name')
                n_val_str = nut.get('value', '0')

                # Regex to extract just the number (remove 'kcal', 'gm', 'mg')
                # e.g., "15kcal" -> 15, "<1gm" -> 0
                numeric_val = 0
                match = re.search(r'(\d+)', n_val_str)
                if match:
                    numeric_val = int(match.group(1))

                macros[n_name] = numeric_val

            # Check if it's a header
            item_type = 'food'
            if serving_size == 'TITLE' or not macros:
                item_type = 'station_header'

            # --- 3. STRUCTURE FOR DB ---
            # We return a flat object that connects the Item info
            # with the specific Station it was found at.
            parsed_items.append({
                "name": name,
                "station": station_name,
                "is_mhealthy": is_mhealthy,
                "nutrition_score": m_score,
                "dietary_tags": dietary_tags,
                "serving_size": serving_size,
                "macronutrients": macros, # JSONB ready
                "item_type": item_type,
                # Pass through context so we know where to save it later
                "context": {
                    "location": location_name,
                    "date": date_str,
                    "meal": meal_name
                }
            })

    return parsed_items
