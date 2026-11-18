"""Fetch and parse University of Michigan NetNutrition menus.

The public site at fss.studentlife.umich.edu has no JSON menu API. Its
page script keeps an ASP.NET session and posts form fields. Navigation
comes back as a JSON envelope of HTML panels. The nutrition label comes
back as an HTML document.

This module turns those responses into plain dicts and can attach them
to item dicts already parsed from the M-Dining API. ``upsert_items``
writes only its known columns, so the extra keys stay in memory until
the items table has a place for them.
"""

import http.cookiejar
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime

from bs4 import BeautifulSoup


DEFAULT_BASE_URL = "https://fss.studentlife.umich.edu/NetNutrition/1"
USER_AGENT = (
    "Mozilla/5.0 (compatible; MaizeMealsScraper/0.1; "
    "+https://github.com/MaizeMeals/maizemeals-app)"
)

_LONG_DATE = "%A, %B %d, %Y"
_SERVING_RE = re.compile(
    r"serving size:\s*(.+?)\s*\(\s*(\d+(?:\.\d+)?)\s*g\s*\)\s*$",
    re.IGNORECASE,
)
_AMOUNT_RE = re.compile(r"^(?:<\s*)?(\d+(?:\.\d+)?)([a-zA-Z]+)?$")
_PERCENT_RE = re.compile(r"^(\d+(?:\.\d+)?)\s*%$")
_DETAIL_OID_RE = re.compile(
    r"getItemNutritionLabelOnClick\(\s*event\s*,\s*(\d+)\s*\)"
)
_UNIT_OID_RE = re.compile(r"unitsSelectUnit\((\d+)\)")
_CHILD_OID_RE = re.compile(r"childUnitsSelectUnit\((\d+)\)")
_MENU_OID_RE = re.compile(r"menuListSelectMenu\((\d+)\)")


class NetNutritionError(Exception):
    """The NetNutrition session or one of its actions failed."""


def clean(value):
    """Collapse whitespace and turn non-breaking spaces into spaces."""
    if value is None:
        return ""
    return " ".join(str(value).replace("\xa0", " ").split())


def normalize_name(value):
    """Lowercase a name and drop punctuation so API and label names match."""
    text = clean(value).casefold().replace("’", "'").replace("`", "'")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def _number(text):
    raw = clean(text)
    if not raw or not re.fullmatch(r"\d+(?:\.\d+)?", raw):
        return None
    value = float(raw)
    return int(value) if value.is_integer() else value


def _labeled_number(cell):
    """Read a calorie cell. Some labels mark the figure as incomplete."""
    if cell is None:
        return None, False
    span = cell.select_one(
        "span.cbo_nn_SecondaryNutrient, span.cbo_nn_LabelDetailIncomplete"
    )
    if span is None:
        return None, False
    incomplete = "cbo_nn_LabelDetailIncomplete" in (span.get("class") or [])
    return _number(span.get_text()), incomplete


def _percent(text):
    raw = clean(text)
    match = _PERCENT_RE.fullmatch(raw)
    if not match:
        return None
    value = float(match.group(1))
    return int(value) if value.is_integer() else value


def _split_amount(text):
    raw = clean(text)
    if not raw or raw == "%" or raw.upper() == "NA":
        return raw or None, None, None
    match = _AMOUNT_RE.fullmatch(raw)
    if not match:
        return raw, None, None
    # "< 1g" is an upper bound, not a measured 1g, so keep the raw text and
    # leave the numeric value empty. The unit is still real.
    if raw.startswith("<"):
        return raw, None, match.group(2)
    value = float(match.group(1))
    if value.is_integer():
        value = int(value)
    return raw, value, match.group(2)


def _nutrient(name, amount_text, percent_text, section):
    amount, amount_value, unit = _split_amount(amount_text)
    return {
        "name": name,
        "section": section,
        "amount": amount,
        "amount_value": amount_value,
        "unit": unit,
        "daily_value_pct": _percent(percent_text),
    }


def _unique(rows, key):
    seen = set()
    unique = []
    for row in rows:
        marker = row.get(key)
        if marker in seen:
            continue
        seen.add(marker)
        unique.append(row)
    return unique


def _onclick_id(tag, pattern):
    if tag is None:
        return None
    match = pattern.search(tag.get("onclick") or "")
    return match.group(1) if match else None


def parse_units(html):
    """Top-level locations from the NetNutrition home page."""
    soup = BeautifulSoup(html or "", "html.parser")
    units = []
    for link in soup.find_all("a"):
        unit_oid = _onclick_id(link, _UNIT_OID_RE)
        name = clean(link.get_text(" ", strip=True))
        if unit_oid and name:
            units.append({"unit_oid": unit_oid, "name": name})
    return _unique(units, "unit_oid")


def parse_child_units(html):
    """Child menus inside a location, such as Daily Menu or Beverages."""
    soup = BeautifulSoup(html or "", "html.parser")
    children = []
    for link in soup.find_all("a"):
        unit_oid = _onclick_id(link, _CHILD_OID_RE)
        name = clean(link.get_text(" ", strip=True))
        if unit_oid and name:
            children.append({"unit_oid": unit_oid, "name": name})
    return _unique(children, "unit_oid")


def _parse_menu_date(label):
    try:
        return datetime.strptime(label, _LONG_DATE).date().isoformat()
    except ValueError:
        return None


def parse_menus(html):
    """Dated meal links. Each card header is the menu date."""
    soup = BeautifulSoup(html or "", "html.parser")
    menus = []
    cards = soup.select("section.card") or [soup]
    for card in cards:
        header = card.find("header")
        date_label = clean(header.get_text(" ", strip=True)) if header else ""
        menu_date = _parse_menu_date(date_label)
        for link in card.select("a.cbo_nn_menuLink"):
            menu_oid = _onclick_id(link, _MENU_OID_RE)
            meal = clean(link.get_text(" ", strip=True))
            if menu_oid and meal:
                menus.append({
                    "menu_oid": menu_oid,
                    "meal": meal,
                    "date": menu_date,
                    "date_label": date_label or None,
                })
    return _unique(menus, "menu_oid")


def _item_name(link):
    parts = []
    for child in link.children:
        # NavigableString subclasses str, so it has str.find. Only tags have a
        # BeautifulSoup name and a find() that searches elements.
        if getattr(child, "name", None) is None:
            text = clean(str(child))
        elif child.name == "img" or child.find("img"):
            continue
        else:
            text = clean(child.get_text(" ", strip=True))
        if text:
            parts.append(text)
    return clean(" ".join(parts))


def _serving_size(row):
    for cell in row.find_all("td", recursive=False):
        if cell.select_one("a, button, input, select"):
            continue
        text = clean(cell.get_text(" ", strip=True))
        if text:
            return text
    return None


def parse_menu_items(html):
    """Items on one meal, with the station taken from the group row above them."""
    soup = BeautifulSoup(html or "", "html.parser")
    items = []
    station = None
    for row in soup.find_all("tr"):
        classes = row.get("class") or []
        if "cbo_nn_itemGroupRow" in classes:
            button = row.find(attrs={"role": "button"}) or row
            station = clean(button.get_text(" ", strip=True)) or None
            continue
        if "cbo_nn_itemPrimaryRow" not in classes:
            continue
        link = row.select_one("a.cbo_nn_itemHover")
        if link is None:
            continue
        detail_oid = _onclick_id(link, _DETAIL_OID_RE)
        if detail_oid is None:
            holder = row.select_one("[data-detailoid]")
            detail_oid = holder.get("data-detailoid") if holder else None
        attributes = [
            title for title in (
                image.get("title") for image in link.find_all("img")
            )
            if title
        ]
        name = _item_name(link)
        if not name:
            continue
        items.append({
            "detail_oid": detail_oid,
            "name": name,
            "station": station,
            "course_oid": row.get("data-categoryid"),
            "serving_size": _serving_size(row),
            "attributes": attributes,
        })
    return items


def _split_serving(label):
    text = clean(label)
    match = _SERVING_RE.search(text)
    if not match:
        stripped = re.sub(r"^serving size:\s*", "", text, flags=re.IGNORECASE)
        return stripped or None, None
    grams = float(match.group(2))
    if grams.is_integer():
        grams = int(grams)
    return clean(match.group(1)), grams


def _row_name_and_amount(row):
    cells = row.find_all("td", recursive=False)
    if not cells:
        return "", None
    amount = row.select_one(
        "span.cbo_nn_SecondaryNutrient, span.cbo_nn_LabelPrimaryDetailIncomplete"
    )
    return clean(cells[0].get_text(" ", strip=True)), (
        clean(amount.get_text(" ", strip=True)) if amount else None
    )


def _main_nutrients(soup):
    nutrients = []
    for header in soup.select("td.cbo_nn_LabelBorderedSubHeader"):
        if header.select_one("td.cbo_nn_LabelDetail, td.cbo_nn_LabelDetailRight"):
            continue
        inner = header.find("tr")
        if inner is None:
            continue
        name, amount = _row_name_and_amount(inner)
        if not name or name.casefold().startswith("calories"):
            continue
        percent_cell = inner.select_one(
            "td.cbo_nn_LabelLeftPaddedDetail, "
            "td.cbo_nn_LabelLeftPaddedDetailIncomplete"
        )
        percent = clean(percent_cell.get_text(" ", strip=True)) if percent_cell else ""
        nutrients.append(_nutrient(name, amount, percent, "main"))
    return nutrients


def _percent_rows(rows, section):
    nutrients = []
    for row in rows:
        cells = row.find_all("td", recursive=False)
        if len(cells) < 2:
            continue
        name = clean(cells[0].get_text(" ", strip=True))
        if not name or name.casefold().startswith("additional nutrition"):
            continue
        percent = clean(cells[-1].get_text(" ", strip=True))
        nutrients.append(_nutrient(name, None, percent, section))
    return nutrients


def _additional_rows(soup):
    container = soup.select_one("div.cbo_nn_AdditonalNutrientLabel")
    if container is None:
        return []
    rows = container.find_all("tr")
    if rows:
        return rows
    rows = []
    for sibling in container.next_siblings:
        name = getattr(sibling, "name", None)
        if name == "tr":
            rows.append(sibling)
        elif name in {"table", "div"}:
            break
    return rows


def _allergen_list(text):
    cleaned = clean(text).rstrip(".")
    if not cleaned:
        return []
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def parse_nutrition_label(html):
    """Parse one nutrition label, including ingredients and the Contains line."""
    soup = BeautifulSoup(html or "", "html.parser")
    serving_label = clean(
        soup.select_one("td.cbo_nn_LabelBottomBorderLabel").get_text(" ", strip=True)
    ) if soup.select_one("td.cbo_nn_LabelBottomBorderLabel") else ""
    serving_size, serving_grams = _split_serving(serving_label)
    calories, calories_incomplete = _labeled_number(soup.select_one("td.cbo_nn_LabelDetail"))
    calories_from_fat, fat_incomplete = _labeled_number(
        soup.select_one("td.cbo_nn_LabelDetailRight")
    )
    ingredients = soup.select_one("span.cbo_nn_LabelIngredients")
    allergens = soup.select_one("span.cbo_nn_LabelAllergens")
    nutrients = _main_nutrients(soup)
    nutrients.extend(_percent_rows(
        soup.select("table.cbo_nn_LabelSecondaryTable tr"),
        "vitamin",
    ))
    nutrients.extend(_percent_rows(_additional_rows(soup), "additional"))
    return {
        "name": clean(
            soup.select_one("td.cbo_nn_LabelHeader").get_text(" ", strip=True)
        ) if soup.select_one("td.cbo_nn_LabelHeader") else None,
        "serving_size": serving_size,
        "serving_grams": serving_grams,
        "serving_size_label": serving_label or None,
        "calories": calories,
        "calories_incomplete": calories_incomplete,
        "calories_from_fat": calories_from_fat,
        "calories_from_fat_incomplete": fat_incomplete,
        "nutrients": nutrients,
        "ingredients": clean(ingredients.get_text(" ", strip=True)) if ingredients else None,
        "allergens": _allergen_list(allergens.get_text(" ", strip=True)) if allergens else [],
    }


def find_by_name(records, name, field="name"):
    """Return the record whose field matches exactly after normalization."""
    wanted = normalize_name(name)
    if not wanted:
        return None
    matches = [
        record for record in records
        if normalize_name(record.get(field)) == wanted
    ]
    return matches[0] if matches else None


def find_menu(menus, on_date, meal):
    """Find one meal on one calendar date. ``on_date`` is YYYY-MM-DD or a date."""
    if isinstance(on_date, datetime):
        day = on_date.date().isoformat()
    elif isinstance(on_date, date):
        day = on_date.isoformat()
    else:
        day = str(on_date)
    wanted_meal = clean(meal).casefold()
    for menu in menus:
        if menu.get("date") == day and clean(menu.get("meal")).casefold() == wanted_meal:
            return menu
    return None


def augment_api_items(api_items, nutrition_items):
    """Copy API items and attach a NetNutrition label when the name matches.

    Station breaks a tie when the same name is on the menu twice. The
    original dicts are not modified. New keys are ingredients, allergens,
    nutrition_label, and netnutrition. The database upsert does not read them.
    """
    grouped = {}
    for item in nutrition_items:
        grouped.setdefault(normalize_name(item.get("name")), []).append(item)

    augmented = []
    for api_item in api_items:
        merged = dict(api_item)
        candidates = grouped.get(normalize_name(api_item.get("name")), [])
        station = normalize_name(api_item.get("station"))
        match = None
        if station:
            for candidate in candidates:
                if normalize_name(candidate.get("station")) == station:
                    match = candidate
                    break
        if match is None and candidates:
            match = candidates[0]
        label = match.get("nutrition_label") if match else None
        merged["ingredients"] = label.get("ingredients") if label else None
        merged["allergens"] = list(label.get("allergens") or []) if label else []
        merged["nutrition_label"] = label
        merged["netnutrition"] = None if match is None else {
            "detail_oid": match.get("detail_oid"),
            "menu_oid": match.get("menu_oid"),
            "station": match.get("station"),
            "attributes": list(match.get("attributes") or []),
        }
        augmented.append(merged)
    return augmented


def _panels_by_id(data):
    panels = data.get("panels") if isinstance(data, dict) else None
    if isinstance(panels, dict):
        return {
            str(key): (value.get("html") or "") if isinstance(value, dict) else str(value or "")
            for key, value in panels.items()
        }
    collected = {}
    for panel in panels or []:
        if isinstance(panel, dict) and panel.get("id"):
            collected[str(panel["id"])] = panel.get("html") or ""
    return collected


class NetNutritionClient:
    """One ASP.NET session. Pass an opener in tests to skip the network."""

    def __init__(self, base_url=DEFAULT_BASE_URL, pause_seconds=0.3, opener=None):
        self.base_url = base_url.rstrip("/")
        self.pause_seconds = pause_seconds
        self._jar = http.cookiejar.CookieJar()
        self._injected_opener = opener is not None
        self._opener = opener
        self._ready = False
        self._last_request = 0.0

    def open_session(self):
        if self._ready:
            return
        if self._injected_opener:
            self._ready = True
            return
        # The first response is a redirect that sets the session cookies.
        # Following it without sending those cookies back loops.
        class _NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        prime = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._jar),
            _NoRedirect,
        )
        request = urllib.request.Request(
            self.base_url,
            headers={"User-Agent": USER_AGENT},
        )
        try:
            with prime.open(request, timeout=30) as response:
                response.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in (301, 302, 303, 307, 308):
                raise NetNutritionError(
                    f"session start failed: HTTP {exc.code}"
                ) from exc
            self._jar.extract_cookies(exc, request)
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._jar)
        )
        body, _content_type = self._read("GET", "")
        if b"netnutrition" not in body.lower():
            raise NetNutritionError("session page did not look like NetNutrition")
        self._ready = True

    def _pause(self):
        if self.pause_seconds <= 0:
            return
        remaining = self.pause_seconds - (time.monotonic() - self._last_request)
        if self._last_request and remaining > 0:
            time.sleep(remaining)
        self._last_request = time.monotonic()

    def _read(self, method, path, form=None):
        self._pause()
        headers = {
            "User-Agent": USER_AGENT,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": self.base_url,
            "Accept": "application/json, text/html, */*; q=0.01",
        }
        data = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with self._opener.open(request, timeout=40) as response:
                body = response.read()
                content_type = response.headers.get_content_type()
        except urllib.error.HTTPError as exc:
            raise NetNutritionError(f"HTTP {exc.code} from {path or '/'}") from exc
        except urllib.error.URLError as exc:
            raise NetNutritionError(f"request failed for {path or '/'}") from exc
        return body, content_type or ""

    def _post_json(self, path, form):
        self.open_session()
        body, content_type = self._read("POST", path, form)
        if "json" not in content_type and not body.lstrip().startswith((b"{", b"[")):
            text = body.decode("utf-8", "replace")
            if "Start-up Error" in text:
                raise NetNutritionError("NetNutrition session was not ready")
            raise NetNutritionError(f"expected JSON from {path}")
        try:
            data = json.loads(body.decode("utf-8-sig"))
        except json.JSONDecodeError as exc:
            raise NetNutritionError(f"invalid JSON from {path}") from exc
        if isinstance(data, dict) and data.get("success") is False:
            raise NetNutritionError(f"{path} reported failure")
        return data

    def home_html(self):
        self.open_session()
        body, _content_type = self._read("GET", "")
        return body.decode("utf-8", "replace")

    def select_unit(self, unit_oid):
        return _panels_by_id(self._post_json(
            "/Unit/SelectUnitFromUnitsList",
            {"unitOid": str(unit_oid)},
        ))

    def select_child(self, unit_oid):
        panels = _panels_by_id(self._post_json(
            "/Unit/SelectUnitFromChildUnitsList",
            {"unitOid": str(unit_oid)},
        ))
        return panels.get("menuPanel") or ""

    def select_menu(self, menu_oid):
        panels = _panels_by_id(self._post_json(
            "/Menu/SelectMenu",
            {"menuOid": str(menu_oid)},
        ))
        return panels.get("itemPanel") or ""

    def fetch_label_html(self, detail_oid, menu_oid):
        self.open_session()
        body, _content_type = self._read(
            "POST",
            "/NutritionDetail/ShowItemNutritionLabel",
            {"detailOid": str(detail_oid), "menuOid": str(menu_oid)},
        )
        text = body.decode("utf-8", "replace")
        if "Start-up Error" in text:
            raise NetNutritionError("NetNutrition session was not ready")
        return text


def _matching_targets(client, unit_name, on_date, meal, child_name):
    units = parse_units(client.home_html())
    unit = find_by_name(units, unit_name)
    if unit is None:
        raise NetNutritionError(f"no NetNutrition unit named {unit_name!r}")
    panels = client.select_unit(unit["unit_oid"])
    children = parse_child_units(panels.get("childUnitsPanel") or "")
    targets = []
    if children:
        chosen = children
        if child_name:
            child = find_by_name(children, child_name)
            if child is None:
                raise NetNutritionError(
                    f"no child menu named {child_name!r} under {unit['name']}"
                )
            chosen = [child]
        for child in chosen:
            menu = find_menu(parse_menus(client.select_child(child["unit_oid"])), on_date, meal)
            if menu is not None:
                targets.append((unit, child, menu))
        if not targets:
            where = child_name or unit["name"]
            raise NetNutritionError(f"no {meal} menu on {on_date} for {where}")
        return targets
    menu = find_menu(parse_menus(panels.get("menuPanel") or ""), on_date, meal)
    if menu is None:
        raise NetNutritionError(f"no {meal} menu on {on_date} for {unit['name']}")
    return [(unit, None, menu)]


def load_nutrition(
    client,
    unit_name,
    on_date,
    meal,
    child_name=None,
    item_name=None,
    on_label=None,
):
    """Load one location's meal and the nutrition label for each item.

    ``child_name`` limits a parent location such as Wolverine Village to
    one child, usually Daily Menu. Without it, every child that has that
    date and meal is included. ``item_name`` fetches only that item's label.
    """
    bundles = []
    for unit, child, menu in _matching_targets(
        client, unit_name, on_date, meal, child_name
    ):
        items = parse_menu_items(client.select_menu(menu["menu_oid"]))
        if item_name:
            wanted = normalize_name(item_name)
            items = [item for item in items if normalize_name(item["name"]) == wanted]
        for item in items:
            item["menu_oid"] = menu["menu_oid"]
            item["date"] = menu["date"]
            item["meal"] = menu["meal"]
            if not item.get("detail_oid"):
                item["nutrition_label"] = None
                item["nutrition_error"] = "item has no detail id"
                continue
            if on_label:
                on_label(item["name"])
            try:
                label_html = client.fetch_label_html(item["detail_oid"], menu["menu_oid"])
                label = parse_nutrition_label(label_html)
            except NetNutritionError as exc:
                item["nutrition_label"] = None
                item["nutrition_error"] = str(exc)
                continue
            if not label.get("name"):
                item["nutrition_label"] = label
                item["nutrition_error"] = "label had no item name"
                continue
            item["nutrition_label"] = label
            item["nutrition_error"] = None
        if item_name and not items:
            continue
        bundles.append({
            "unit": unit,
            "child": child,
            "menu": menu,
            "items": items,
        })
    if not bundles:
        raise NetNutritionError(f"no item named {item_name!r}")
    return bundles
