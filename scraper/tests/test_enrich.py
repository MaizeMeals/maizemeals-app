import unittest
from datetime import datetime, timedelta, timezone

from unittest.mock import MagicMock, patch

from lib.enrich import enrich_ingredients, matching_item, label_payload, unit_for_hall, wanted_items_by_meal

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
            {"meal": "Lunch", "items": {"id": "b", "name": "Has Label", "item_type": "food", "ingredients": "x", "station": "Deli", "nutrition_label": {"source": {"item_id": "b", "item_station": "Deli"}}, "ingredients_checked_at": now.isoformat()}},
            {"meal": "Lunch", "items": {"id": "c", "name": "Checked Recently", "item_type": "food", "ingredients": None, "ingredients_checked_at": now.isoformat()}},
            {"meal": "Lunch", "items": {"id": "d", "name": "Checked Long Ago", "item_type": "food", "ingredients": None, "ingredients_checked_at": (now - timedelta(days=30)).isoformat()}},
            {"meal": "Lunch", "items": {"id": "e", "name": "SOUPS", "item_type": "station_header", "ingredients": None, "ingredients_checked_at": None}},
        ]
        wanted = wanted_items_by_meal(events, cutoff)
        self.assertEqual(sorted(wanted), ["Dinner", "Lunch"])
        lunch_ids = sorted(i["id"] for items in wanted["Lunch"].values() for i in items)
        self.assertEqual(lunch_ids, ["a", "d"])


class MatchingTest(unittest.TestCase):
    def test_duplicate_or_missing_station_is_unresolved(self):
        candidate = {"name": "Soup", "station": "Grill", "detail_oid": "10"}
        target = {"id": "local", "station": "Grill"}
        self.assertEqual(matching_item(candidate, [candidate], [target]), target)
        self.assertIsNone(matching_item(candidate, [candidate, {**candidate, "detail_oid": "11"}], [target]))
        self.assertIsNone(matching_item(candidate, [candidate], [target, {**target, "id": "other"}]))
        self.assertIsNone(matching_item(candidate, [candidate], [{"id": "local", "station": None}]))

    def test_missing_local_label_never_queries_same_name_donors(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "hall", "name": "East Quad", "type": "DINING HALLS"}]
        db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"meal": "Dinner", "items": {"id": "local", "name": "Soup", "station": "Grill",
             "ingredients": "legacy label", "ingredients_checked_at": None}}]
        with patch("lib.enrich.parse_units", return_value=[{"name": "East Quad", "unit_oid": 7}]), \
             patch("lib.enrich._crawl_hall", return_value={}):
            result = enrich_ingredients(db, client_factory=MagicMock(), log=lambda _: None)
        self.assertEqual(result["checked_missing"], 1)
        self.assertEqual(result["copied"], 0)
        db.table.return_value.select.return_value.in_.assert_not_called()
        payload = db.table.return_value.update.call_args.args[0]
        self.assertEqual(set(payload), {"ingredients_checked_at"})

    def test_week_backfill_retries_an_early_miss_on_a_later_date(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "hall", "name": "East Quad", "type": "DINING HALLS"}]
        db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"meal": "Dinner", "items": {"id": "local", "name": "Soup", "station": "Grill"}}]
        label = {"name": "Soup", "ingredients": "Carrots", "source": {"item_station": "Grill"}}
        with patch("lib.enrich.parse_units", return_value=[{"name": "East Quad", "unit_oid": 7}]), \
             patch("lib.enrich._crawl_hall", side_effect=[{}, {"local": label}]) as crawl:
            result = enrich_ingredients(db, days_ahead=7, recheck_days=0, client_factory=MagicMock(), log=lambda _: None)
        self.assertEqual(crawl.call_count, 2)
        self.assertEqual(result["labels"], 1)
        self.assertEqual(result["checked_missing"], 0)
        db.table.return_value.update.assert_called_once()



class LabelPayloadTest(unittest.TestCase):
    def test_payload(self):
        label = {"name": "Wings", "ingredients": "Chicken, soybean oil, TBHQ", "allergens": ["Item is deep fried", "Milk"]}
        p = label_payload(label, "2026-11-18T00:00:00+00:00", "i")
        self.assertEqual(p["allergens"], ["Milk"])
        self.assertEqual(p["label_notes"], ["Item is deep fried"])
        self.assertEqual(p["ingredient_flags"]["categories"], ["seed_oil", "preservative"])
        source = p["nutrition_label"]["source"]
        self.assertEqual(source["item_id"], "i")
        self.assertEqual(source["coverage"], "ingredients")
        self.assertEqual(source["matched_at"], p["ingredients_checked_at"])
        self.assertNotIn("source_item_id", p["ingredient_flags"])

    def test_allergen_only_label_keeps_source_without_highlights(self):
        label = {"ingredients": "", "allergens": ["Milk"], "source": {"item_station": "Grill"}}
        now = datetime.now(timezone.utc)
        row = {"id": "i", "station": "Grill", "name": "Dish", **label_payload(label, now.isoformat(), "i")}
        self.assertEqual(row["nutrition_label"]["source"]["coverage"], "allergens")
        self.assertIsNone(row["ingredient_flags"])
        events = [{"meal": "Dinner", "items": row}]
        cutoff = now - timedelta(days=14)
        self.assertFalse(wanted_items_by_meal(events, cutoff))
        self.assertTrue(wanted_items_by_meal(events, now + timedelta(seconds=1)))
        row["station"] = "Deli"
        self.assertTrue(wanted_items_by_meal(events, cutoff))

    def test_no_ingredients(self):
        p = label_payload({"name": "Water", "ingredients": "  ", "allergens": []}, "t", "i")
        self.assertIsNone(p["ingredients"])
        self.assertIsNone(p["ingredient_flags"])


if __name__ == "__main__":
    unittest.main()
