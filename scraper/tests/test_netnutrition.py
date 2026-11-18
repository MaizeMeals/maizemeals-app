import json
import sys
import unittest
from pathlib import Path

SCRAPER_ROOT = Path(__file__).resolve().parents[1]
if str(SCRAPER_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRAPER_ROOT))

from lib.netnutrition import (  # noqa: E402
    NetNutritionClient,
    NetNutritionError,
    augment_api_items,
    find_by_name,
    load_nutrition,
    parse_child_units,
    parse_menu_items,
    parse_menus,
    parse_nutrition_label,
    parse_units,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "netnutrition"
ALFREDO_INGREDIENTS = (
    "Sauce Alfredo Land O'Lakes Bag(Skim Milk, Water, Cream, Cream Cheese "
    "(pasteurized milk and cream, cheese cultures, salt, guar gum, carob bean gum, "
    "xanthan gum), Parmesan Cheese (cultured milk, salt, enzymes), Romano Cheese "
    "(pasteurized cow's milk, cheese culture, salt, enzymes), Butter (cream, salt), "
    "Food Starch - Modified, Contains Less Than 2% of Maltodextrin, Salt, "
    "Natural Flavors, Sodium Phosphate, Sodium Citrate, Cellulose Gel, "
    "Cellulose Gum, Mono and Diglycerides, Spice.CONTAINS: Milk)"
)


class _Headers:
    def __init__(self, content_type):
        self._content_type = content_type

    def get_content_type(self):
        return self._content_type.split(";", 1)[0].strip()


class _Response:
    def __init__(self, body, content_type):
        self._body = body if isinstance(body, bytes) else body.encode()
        self.headers = _Headers(content_type)

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class _ScriptedOpener:
    def __init__(self, routes):
        self.routes = routes
        self.requests = []

    def open(self, request, timeout=None):
        self.requests.append(request)
        for suffix, body, content_type in self.routes:
            if request.full_url.endswith(suffix):
                return _Response(body, content_type)
        raise AssertionError(request.full_url)


def _json_route(suffix, html, panel_id):
    body = json.dumps({
        "success": True,
        "panels": [{"id": panel_id, "html": html}],
    })
    return suffix, body, "application/json; charset=utf-8"


class NetNutritionParseTests(unittest.TestCase):
    def test_units_match_wolverine_village_exactly(self):
        units = parse_units((FIXTURES / "units.html").read_text())
        self.assertEqual(len(units), 20)
        match = find_by_name(units, "Wolverine Village")
        self.assertEqual(match["unit_oid"], "98")
        self.assertEqual(
            find_by_name(units, "Blue Cafe and Market Wolverine Village")["unit_oid"],
            "19",
        )
        self.assertIsNone(find_by_name(units, "Village"))

    def test_child_units_and_menu_list(self):
        children = parse_child_units(
            '<a onclick="javascript:NetNutrition.UI.childUnitsSelectUnit(99);">Daily Menu</a>'
            '<a onclick="javascript:NetNutrition.UI.childUnitsSelectUnit(100);">Beverages</a>'
        )
        self.assertEqual(children[0]["name"], "Daily Menu")
        menus = parse_menus((FIXTURES / "menu-list.html").read_text())
        lunch = next(menu for menu in menus if menu["meal"] == "Lunch")
        self.assertEqual(lunch["date"], "2026-11-17")
        self.assertEqual(lunch["menu_oid"], "1794954")
        self.assertEqual(menus[0]["meal"], "Breakfast")
        self.assertEqual(menus[2]["menu_oid"], "1794955")

    def test_menu_item_row_ignores_icon_text(self):
        items = parse_menu_items((FIXTURES / "menu-items.html").read_text())
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["name"], "Alfredo Sauce")
        self.assertEqual(item["station"], "Rotisserie")
        self.assertEqual(item["serving_size"], "1/4 Cup")
        self.assertEqual(item["detail_oid"], "121768401")
        self.assertEqual(item["course_oid"], "243")
        self.assertEqual(
            item["attributes"],
            ["carbonhigh", "Gluten-Free", "MHealthy1", "Vegetarian"],
        )

    def test_alfredo_label_matches_the_published_nutrition_facts(self):
        label = parse_nutrition_label((FIXTURES / "alfredo-label.html").read_text())
        self.assertEqual(label["name"], "Alfredo Sauce")
        self.assertEqual(label["serving_size"], "1/4 Cup")
        self.assertEqual(label["serving_grams"], 85)
        self.assertEqual(label["calories"], 160)
        self.assertFalse(label["calories_incomplete"])
        self.assertEqual(label["calories_from_fat"], 126)
        self.assertFalse(label["calories_from_fat_incomplete"])
        self.assertEqual(label["ingredients"], ALFREDO_INGREDIENTS)
        self.assertEqual(label["allergens"], ["Milk"])

        by_name = {nutrient["name"]: nutrient for nutrient in label["nutrients"]}
        self.assertEqual(
            [nutrient["name"] for nutrient in label["nutrients"] if nutrient["section"] == "main"],
            [
                "Total Fat",
                "Saturated Fat",
                "Trans Fat",
                "Cholesterol",
                "Sodium",
                "Potassium",
                "Total Carbohydrate",
                "Dietary Fiber",
                "Sugars",
                "Protein",
            ],
        )
        self.assertEqual(by_name["Total Fat"], {
            "name": "Total Fat",
            "section": "main",
            "amount": "14g",
            "amount_value": 14,
            "unit": "g",
            "daily_value_pct": 21,
        })
        self.assertEqual(by_name["Saturated Fat"]["amount"], "8g")
        self.assertEqual(by_name["Saturated Fat"]["daily_value_pct"], 37)
        self.assertEqual(by_name["Trans Fat"]["amount"], "NA")
        self.assertIsNone(by_name["Trans Fat"]["amount_value"])
        self.assertIsNone(by_name["Trans Fat"]["daily_value_pct"])
        self.assertEqual(by_name["Cholesterol"]["amount"], "40mg")
        self.assertEqual(by_name["Cholesterol"]["unit"], "mg")
        self.assertEqual(by_name["Cholesterol"]["daily_value_pct"], 14)
        self.assertEqual(by_name["Sodium"]["amount"], "580mg")
        self.assertEqual(by_name["Sodium"]["daily_value_pct"], 38)
        self.assertEqual(by_name["Potassium"]["amount"], "75mg")
        self.assertIsNone(by_name["Potassium"]["daily_value_pct"])
        self.assertEqual(by_name["Total Carbohydrate"]["amount"], "5g")
        self.assertEqual(by_name["Total Carbohydrate"]["daily_value_pct"], 2)
        self.assertEqual(by_name["Dietary Fiber"]["amount"], "0g")
        self.assertEqual(by_name["Dietary Fiber"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Sugars"]["amount"], "3g")
        self.assertEqual(by_name["Sugars"]["daily_value_pct"], 5)
        self.assertEqual(by_name["Protein"]["amount"], "5g")
        self.assertEqual(by_name["Protein"]["daily_value_pct"], 7)
        self.assertEqual(by_name["Vitamin A"]["section"], "vitamin")
        self.assertEqual(by_name["Vitamin A"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Vitamin C"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Calcium"]["daily_value_pct"], 15)
        self.assertEqual(by_name["Iron"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Magnesium"]["section"], "additional")
        self.assertEqual(by_name["Magnesium"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Zinc"]["daily_value_pct"], 0)
        self.assertIsNone(by_name["Copper"]["daily_value_pct"])
        self.assertIsNone(by_name["Copper"]["amount"])
        self.assertEqual(by_name["Thiamin"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Riboflavin"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Niacin"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Vitamin B-6"]["daily_value_pct"], 0)
        self.assertEqual(by_name["Vitamin B-12"]["daily_value_pct"], 0)
        self.assertIsNone(by_name["Vitamin D IU units"]["daily_value_pct"])
        self.assertNotIn("Calories", by_name)
        self.assertNotIn("Calories from Fat", by_name)

    def test_incomplete_calorie_figure_and_bounded_amount(self):
        label = parse_nutrition_label(
            (FIXTURES / "italian-beef-label.html").read_text()
        )
        self.assertEqual(label["name"], "Italian Beef Sandwich")
        self.assertEqual(label["serving_size"], "1/2 Sandwich")
        self.assertEqual(label["serving_grams"], 204)
        self.assertEqual(label["calories"], 330)
        self.assertTrue(label["calories_incomplete"])
        self.assertEqual(label["calories_from_fat"], 135)
        self.assertTrue(label["calories_from_fat_incomplete"])
        self.assertEqual(label["allergens"], ["Beef", "Sesame Seed", "Wheat/Barley/Rye"])
        by_name = {nutrient["name"]: nutrient for nutrient in label["nutrients"]}
        self.assertEqual(by_name["Total Fat"]["amount"], "15g")
        self.assertEqual(by_name["Total Fat"]["daily_value_pct"], 23)
        self.assertEqual(by_name["Protein"]["amount"], "23g")

        bounded = parse_nutrition_label(
            """
            <td class="cbo_nn_LabelBorderedSubHeader"><table><tr>
              <td><span style="font-weight:normal;">Sugars</span></td>
              <td><span class="cbo_nn_LabelPrimaryDetailIncomplete">&lt; 1g</span></td>
              <td class="cbo_nn_LabelLeftPaddedDetailIncomplete">1%</td>
            </tr></table></td>
            """
        )
        sugars = bounded["nutrients"][0]
        self.assertEqual(sugars["amount"], "< 1g")
        self.assertIsNone(sugars["amount_value"])
        self.assertEqual(sugars["unit"], "g")
        self.assertEqual(sugars["daily_value_pct"], 1)

    def test_augment_attaches_ingredients_without_changing_api_fields(self):
        items = parse_menu_items((FIXTURES / "menu-items.html").read_text())
        items[0]["nutrition_label"] = parse_nutrition_label(
            (FIXTURES / "alfredo-label.html").read_text()
        )
        items[0]["menu_oid"] = "1794954"
        api_item = {
            "name": " alfredo   sauce ",
            "station": "Rotisserie",
            "is_mhealthy": True,
            "nutrition_score": 1,
            "dietary_tags": ["vegetarian"],
            "serving_size": "1/4 Cup",
            "macronutrients": {"Calories": 160, "Fat": 14},
            "item_type": "food",
        }
        other = dict(api_item, name="Italian Beef Sandwich", station="Rotisserie")
        augmented = augment_api_items([api_item, other], items)
        self.assertNotIn("ingredients", api_item)
        self.assertEqual(augmented[0]["macronutrients"], {"Calories": 160, "Fat": 14})
        self.assertEqual(augmented[0]["ingredients"], ALFREDO_INGREDIENTS)
        self.assertEqual(augmented[0]["allergens"], ["Milk"])
        self.assertEqual(augmented[0]["netnutrition"]["detail_oid"], "121768401")
        self.assertIsNone(augmented[1]["ingredients"])
        self.assertEqual(augmented[1]["allergens"], [])
        self.assertIsNone(augmented[1]["nutrition_label"])


class NetNutritionClientTests(unittest.TestCase):
    def _client(self):
        units = (FIXTURES / "units.html").read_text()
        menus = (FIXTURES / "menu-list.html").read_text()
        items = (FIXTURES / "menu-items.html").read_text()
        label = (FIXTURES / "alfredo-label.html").read_text()
        child = (
            '<a onclick="javascript:NetNutrition.UI.childUnitsSelectUnit(99);">'
            "Daily Menu</a>"
            '<a onclick="javascript:NetNutrition.UI.childUnitsSelectUnit(100);">'
            "Beverages</a>"
        )
        opener = _ScriptedOpener([
            ("/NetNutrition/1", units, "text/html"),
            _json_route("/Unit/SelectUnitFromUnitsList", child, "childUnitsPanel"),
            _json_route("/Unit/SelectUnitFromChildUnitsList", menus, "menuPanel"),
            _json_route("/Menu/SelectMenu", items, "itemPanel"),
            (
                "/NutritionDetail/ShowItemNutritionLabel",
                label,
                "text/html; charset=utf-8",
            ),
        ])
        return NetNutritionClient(opener=opener, pause_seconds=0), opener

    def test_load_nutrition_follows_the_panel_posts(self):
        client, opener = self._client()
        bundles = load_nutrition(
            client,
            "Wolverine Village",
            "2026-11-17",
            "lunch",
            child_name="Daily Menu",
            item_name="Alfredo Sauce",
        )
        self.assertEqual(len(bundles), 1)
        item = bundles[0]["items"][0]
        self.assertEqual(item["nutrition_label"]["calories"], 160)
        self.assertEqual(item["nutrition_label"]["allergens"], ["Milk"])
        self.assertIsNone(item["nutrition_error"])
        bodies = [request.data.decode() for request in opener.requests if request.data]
        self.assertIn("unitOid=98", bodies[0])
        self.assertIn("unitOid=99", bodies[1])
        self.assertIn("menuOid=1794954", bodies[2])
        self.assertIn("detailOid=121768401", bodies[3])
        self.assertIn("menuOid=1794954", bodies[3])
        self.assertTrue(json.dumps(bundles))

    def test_startup_error_on_the_label_is_reported(self):
        client = NetNutritionClient(
            opener=_ScriptedOpener([
                (
                    "/NutritionDetail/ShowItemNutritionLabel",
                    "<html>NetNutrition Start-up Error</html>",
                    "text/html",
                ),
            ]),
            pause_seconds=0,
        )
        with self.assertRaises(NetNutritionError):
            client.fetch_label_html("121768401", "1794954")

    def test_failed_panel_response_is_reported(self):
        client = NetNutritionClient(
            opener=_ScriptedOpener([
                ("/Menu/SelectMenu", '{"success": false, "panels": []}', "application/json"),
            ]),
            pause_seconds=0,
        )
        with self.assertRaises(NetNutritionError):
            client.select_menu("1794954")


if __name__ == "__main__":
    unittest.main()
