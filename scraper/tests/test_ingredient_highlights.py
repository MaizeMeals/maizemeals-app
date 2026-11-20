import unittest

from lib.ingredient_highlights import highlight_ingredients, split_allergens

# Real Bursley label (2026-11-18): Garlic Parmesan Chicken Wings.
WINGS = (
    "Chicken Party Wings Fresh(Chicken.), Cheese Parmesan Grated, Oil Soy Frying Zoye"
    "(100% pure soybean oil (TBHQ and citric acid added as preservatives, and "
    "dimethylpolysiloxane added as an anti-foaming agent).), Oil Olive Primo Gusto Extra "
    "Virgin(Extra Virgin Olive Oil), Garlic, Oregano Fresh, Fresh Thyme"
)

BREAD = (
    "Enriched Flour (Wheat Flour, Niacin, Reduced Iron, Thiamine Mononitrate, Riboflavin, "
    "Folic Acid), Water, Sugar, Mono- and Diglycerides, Calcium Propionate (Preservative), "
    "Natural Flavors, Red 40, Food Starch - Modified, Maltodextrin, Partially Hydrogenated "
    "Cottonseed Oil, Canola Oil, Xanthan Gum, Soy Lecithin, Baking Soda"
)


def by_text(text, result):
    return {text[s["start"]:s["end"]]: (s["category"], s["label"]) for s in result["spans"]}


class HighlightTest(unittest.TestCase):
    def test_real_wings_label(self):
        r = highlight_ingredients(WINGS)
        found = by_text(WINGS, r)
        self.assertEqual(found["soybean oil"][0], "seed_oil")
        self.assertEqual(found["TBHQ"][0], "preservative")
        self.assertEqual(found["dimethylpolysiloxane"], ("other", "Anti-foaming agent"))
        self.assertNotIn("Olive Oil", found)  # olive oil is not a seed oil

    def test_categories_follow_display_order(self):
        r = highlight_ingredients(BREAD)
        self.assertEqual(
            r["categories"],
            ["seed_oil", "hydrogenated_oil", "color", "preservative", "emulsifier",
             "flavoring", "thickener", "other"],
        )

    def test_category_choices(self):
        found = by_text(BREAD, highlight_ingredients(BREAD))
        self.assertEqual(found["Mono- and Diglycerides"][0], "emulsifier")
        self.assertEqual(found["Lecithin"][0], "emulsifier")
        self.assertEqual(found["Xanthan Gum"][0], "thickener")
        self.assertEqual(found["Red 40"][0], "color")
        self.assertEqual(found["Natural Flavors"][0], "flavoring")
        self.assertEqual(found["Food Starch - Modified"][0], "thickener")
        self.assertEqual(found["Maltodextrin"], ("other", "Filler"))
        self.assertEqual(found["Baking Soda"], ("other", "Leavening"))
        # The longer hydrogenated phrase wins over the seed-oil hit inside it.
        self.assertEqual(found["Partially Hydrogenated Cottonseed Oil"][0], "hydrogenated_oil")

    def test_fortification_vitamins_are_not_dyes(self):
        found = by_text(BREAD, highlight_ingredients(BREAD))
        for vitamin in ("Riboflavin", "Niacin", "Folic Acid", "Reduced Iron"):
            self.assertNotIn(vitamin, found)

    def test_spans_do_not_overlap_and_index_original_text(self):
        r = highlight_ingredients(BREAD)
        last_end = -1
        for span in r["spans"]:
            self.assertGreaterEqual(span["start"], last_end)
            self.assertEqual(BREAD[span["start"]:span["end"]], span["matched"])
            last_end = span["end"]

    def test_empty(self):
        self.assertIsNone(highlight_ingredients(None))
        self.assertIsNone(highlight_ingredients("   "))
        self.assertEqual(highlight_ingredients("Chicken, Garlic, Olive Oil"), {"categories": [], "spans": []})


class OilAndAntiCakingTest(unittest.TestCase):
    def test_palm_and_anti_caking(self):
        text = "Palm Oil, Salt (Yellow Prussiate of Soda), Silicon Dioxide"
        found = by_text(text, highlight_ingredients(text))
        self.assertEqual(found["Palm Oil"][0], "palm_oil")
        self.assertEqual(found["Yellow Prussiate of Soda"], ("other", "Anti-caking agent"))
        self.assertEqual(found["Silicon Dioxide"], ("other", "Anti-caking agent"))


class MineralSaltTest(unittest.TestCase):
    def test_tofu_coagulants_are_not_dyes(self):
        result = highlight_ingredients("Tofu (Water, Soybeans, Magnesium Chloride, Calcium Sulfate)")
        self.assertEqual({s["label"] for s in result["spans"]}, {"Firming agent"})
        self.assertNotIn("color", result["categories"])

    def test_dangling_parenthesis_trimmed(self):
        text = "Paprika Oleoresin (Color), Salt"
        span = highlight_ingredients(text)["spans"][0]
        self.assertEqual(text[span["start"]:span["end"]], "Paprika Oleoresin")
        self.assertEqual(span["category"], "color")


class AllergenTest(unittest.TestCase):
    def test_gluten_grains(self):
        self.assertEqual(split_allergens(["Wheat/Barley/Rye", "Oats", "Beef"]), (["Gluten"], ["Oats", "Beef"]))

    def test_split(self):
        self.assertEqual(
            split_allergens(["Item is deep fried", "Milk", "Tree Nuts", "Wheat ", "milk"]),
            (["Milk", "Tree nuts", "Wheat"], ["Item is deep fried"]),
        )


if __name__ == "__main__":
    unittest.main()


def test_inventory_style_oils_are_flagged():
    # Dining labels often write the oil type after "oil".
    for text in ["Oil Canola", "Oil Soy Frying Zoye", "Oil Soybean Butter Flavor"]:
        spans = highlight_ingredients(text)["spans"]
        assert spans and spans[0]["category"] == "seed_oil", text
    spans = highlight_ingredients("OIL (CORN AND CANOLA), SALT")["spans"]
    assert [s["matched"] for s in spans] == ["CORN", "CANOLA"]
    assert {s["category"] for s in spans} == {"seed_oil"}
    assert highlight_ingredients("Oil Palm Kernel")["spans"][0]["category"] == "palm_oil"


def test_inventory_style_oils_do_not_cross_punctuation():
    assert not highlight_ingredients("Olive oil, corn starch")["spans"]
    spans = highlight_ingredients("oil (corn syrup solids)")["spans"]
    assert all(s["category"] != "seed_oil" for s in spans)
