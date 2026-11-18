import unittest
from datetime import datetime, timedelta, timezone

from lib.enrich import label_payload, unit_for_hall, wanted_items_by_meal

UNITS = [{"name": n, "unit_oid": i} for i, n in enumerate(
    ["Bakeshop", "Blue Cafe and Market Wolverine Village", "Bursley", "East Quad",
     "Mosher-Jordan", "Twigs at Oxford", "Wolverine Village", "Lawyers Club"])]


class UnitForHallTest(unittest.TestCase):
    def test_maps_m_dining_names(self):
        self.assertEqual(unit_for_hall(UNITS, "Bursley Dining Hall")["name"], "Bursley")
        self.assertEqual(unit_for_hall(UNITS, "Mosher-Jordan Dining Hall")["name"], "Mosher-Jordan")
        self.assertEqual(unit_for_hall(UNITS, "Twigs Dining Hall")["name"], "Twigs at Oxford")
        self.assertEqual(unit_for_hall(UNITS, "Lawyers Club Dining Hall")["name"], "Lawyers Club")

    def test_prefers_exact_over_partial(self):
        # Not the "Blue Cafe and Market Wolverine Village" unit.
        self.assertEqual(unit_for_hall(UNITS, "Wolverine Village Dining Hall")["name"], "Wolverine Village")

    def test_unknown(self):
        self.assertIsNone(unit_for_hall(UNITS, "Martha Cook Dining Hall"))


class WantedItemsTest(unittest.TestCase):
    def test_filters_and_groups(self):
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=14)
        events = [
            {"meal": "Lunch", "items": {"id": "a", "name": "Corn Dogs", "item_type": "food", "ingredients": None, "ingredients_checked_at": None}},
            {"meal": "Dinner", "items": {"id": "a", "name": "Corn Dogs", "item_type": "food", "ingredients": None, "ingredients_checked_at": None}},
            {"meal": "Lunch", "items": {"id": "b", "name": "Has Label", "item_type": "food", "ingredients": "x", "ingredients_checked_at": None}},
            {"meal": "Lunch", "items": {"id": "c", "name": "Checked Recently", "item_type": "food", "ingredients": None, "ingredients_checked_at": now.isoformat()}},
            {"meal": "Lunch", "items": {"id": "d", "name": "Checked Long Ago", "item_type": "food", "ingredients": None, "ingredients_checked_at": (now - timedelta(days=30)).isoformat()}},
            {"meal": "Lunch", "items": {"id": "e", "name": "SOUPS", "item_type": "station_header", "ingredients": None, "ingredients_checked_at": None}},
        ]
        wanted = wanted_items_by_meal(events, cutoff)
        self.assertEqual(sorted(wanted), ["Dinner", "Lunch"])
        lunch_ids = sorted(i["id"] for items in wanted["Lunch"].values() for i in items)
        self.assertEqual(lunch_ids, ["a", "d"])


class LabelPayloadTest(unittest.TestCase):
    def test_payload(self):
        label = {"name": "Wings", "ingredients": "Chicken, soybean oil, TBHQ", "allergens": ["Item is deep fried", "Milk"]}
        p = label_payload(label, "2026-11-18T00:00:00+00:00")
        self.assertEqual(p["allergens"], ["Milk"])
        self.assertEqual(p["label_notes"], ["Item is deep fried"])
        self.assertEqual(p["ingredient_flags"]["categories"], ["seed_oil", "preservative"])
        self.assertIs(p["nutrition_label"], label)

    def test_no_ingredients(self):
        p = label_payload({"name": "Water", "ingredients": "  ", "allergens": []}, "t")
        self.assertIsNone(p["ingredients"])
        self.assertIsNone(p["ingredient_flags"])


if __name__ == "__main__":
    unittest.main()
