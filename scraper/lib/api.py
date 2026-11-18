import os
import time
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

# Three tries total (not three extra retries). Sleeps between tries follow
# the first steps of this 1s, 2s, 4s series: 1s after the first failure and
# 2s after the second. The 4s step is used only when attempts is raised.
API_ATTEMPTS = 3
API_BACKOFF_SECONDS = (1, 2, 4)


class APIHTTPError(Exception):
    """Non-retryable M-Dining HTTP error (4xx other than 429).

    The message is only the status code, so logs do not include the request
    URL or API key.
    """

    def __init__(self, status_code):
        super().__init__(f"HTTP {status_code}")
        self.status_code = int(status_code)


class RetryableHTTPStatus(Exception):
    """Retryable M-Dining HTTP status (429 or 5xx).

    The message is only the status code, so logs do not include the request
    URL or API key.
    """

    def __init__(self, status_code):
        super().__init__(f"HTTP {status_code}")
        self.status_code = int(status_code)


def is_retryable_status(status_code):
    """True for HTTP 429 and 5xx. Other 4xx responses are not retried."""
    try:
        status = int(status_code)
    except (TypeError, ValueError):
        return False
    return status == 429 or 500 <= status <= 599


def is_retryable_exception(exc):
    """Retry transport errors, HTTP 429, and 5xx. Do not retry other 4xx."""
    status = getattr(exc, "status_code", None)
    if status is None:
        response = getattr(exc, "response", None)
        status = getattr(response, "status_code", None)
    if status is None:
        return True
    return is_retryable_status(status)


def backoff_seconds(failed_attempt_index, backoff=API_BACKOFF_SECONDS):
    """Seconds to wait after a failed attempt before the next try.

    Index 0, 1, 2 maps to about 1s, 2s, 4s.
    """
    if failed_attempt_index < len(backoff):
        return backoff[failed_attempt_index]
    return backoff[-1]


def call_with_retries(fn, *, attempts=API_ATTEMPTS, backoff=API_BACKOFF_SECONDS, sleep=None):
    """Call ``fn`` up to ``attempts`` times.

    Retries exceptions, HTTP 429, and HTTP 5xx. Does not retry other 4xx.
    Sleeps live in this helper (default ``time.sleep``) so tests can pass
    a fake sleeper or patch ``time.sleep``. With the default 3 attempts the
    waits between tries are 1s then 2s.
    """
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    if sleep is None:
        sleep = time.sleep

    for attempt in range(attempts):
        try:
            return fn()
        except Exception as exc:
            if not is_retryable_exception(exc) or attempt >= attempts - 1:
                raise
            delay = backoff_seconds(attempt, backoff)
            status = getattr(exc, "status_code", None)
            if status is None:
                response = getattr(exc, "response", None)
                status = getattr(response, "status_code", None)
            label = f"HTTP {status}" if status else type(exc).__name__
            # Log the status or exception type only. Exception text can
            # contain the request URL, including the API key.
            print(
                f"API request failed ({label}); retrying in {delay}s "
                f"(attempt {attempt + 1} of {attempts})"
            )
            sleep(delay)


def _request_json(endpoint, params):
    """GET ``endpoint`` and return parsed JSON, retrying transient failures.

    Raises APIHTTPError for a non-retryable HTTP status, RetryableHTTPStatus
    when 429/5xx persists, or the underlying exception for other failures.
    """

    def attempt():
        response = scraper.get(endpoint, params=params)
        status = int(getattr(response, "status_code", 0) or 0)
        if is_retryable_status(status):
            raise RetryableHTTPStatus(status)
        if status >= 400:
            raise APIHTTPError(status)
        return response.json()

    return call_with_retries(attempt)


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
    data = _request_json(endpoint, params)

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
        date_str (str): Format "DD-MM-YYYY" (e.g., "09-02-2026" is 9 February 2026)

    Returns:
        list: A list of dicts with meal times, e.g.:
              [{'meal': 'Breakfast', 'start': '2026-02-09T07:00:00-05:00', 'end': '...'}]
              An empty list means the request succeeded and the location is closed.

    Raises:
        Exception: When the hours request fails. That is not a closed day.
    """
    endpoint = urljoin(BASE_URL, "dining/meal-hours")

    params = {
        "key": API_KEY,
        "location": location_name,
        "date": date_str
    }

    print(f"Fetching hours for {location_name} on {date_str}...")
    data = _request_json(endpoint, params)

    raw_hours = data.get('hours', [])
    schedule = []

    for event in raw_hours:
        meal_name = event.get('event_title', '').strip()
        start_iso = event.get('event_time_start')
        end_iso = event.get('event_time_end')

        if meal_name and start_iso and end_iso:
            schedule.append({
                "meal": meal_name.upper(),
                "start_time": start_iso,
                "end_time": end_iso
            })

    return schedule

def fetch_menu_data(location_name: str, date_str: str, meal_name: str):
    """
    Fetches and parses menu data for a specific hall, date, and meal.

    Args:
        location_name (str): e.g., "Bursley Dining Hall"
        date_str (str): Format "DD-MM-YYYY" (e.g., "09-02-2026" is 9 February 2026)
        meal_name (str): "BREAKFAST", "BRUNCH", "LUNCH", "DINNER"

    Returns:
        list: Parsed item dictionaries. An empty list means the request
        succeeded and this meal has no items. Keep the existing menu when
        this function raises; a failure is not an empty menu.
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
    data = _request_json(endpoint, params)

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

            if not name or "no service at this time" in name.lower():
                continue

            # Extract Attributes (Dietary Tags + MHealthy)
            raw_attributes = item.get('attribute', [])
            if isinstance(raw_attributes, str):
                raw_attributes = [raw_attributes]
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
                if not n_name:
                    continue
                n_val_str = str(nut.get('value') or '0')

                # Preserve decimals while removing units. For labels such as
                # "<1gm", use half the threshold as a conservative estimate.
                numeric_val = 0
                match = re.search(r'(\d+(?:\.\d+)?)', n_val_str)
                if match:
                    numeric_val = float(match.group(1))
                    if '<' in n_val_str:
                        numeric_val /= 2

                    if numeric_val.is_integer():
                        numeric_val = int(numeric_val)

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
