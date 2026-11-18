import json
import re
import sys
import unittest
from pathlib import Path

SCRAPER_ROOT = Path(__file__).resolve().parents[1]
if str(SCRAPER_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRAPER_ROOT))

from lib.ingredient_flags import scan_ingredients  # noqa: E402

DATA_DIR = SCRAPER_ROOT / "data" / "ingredient-flags"
ROMAN = {
    "i": 1,
    "ii": 2,
    "iii": 3,
    "iv": 4,
    "v": 5,
    "vi": 6,
    "vii": 7,
    "viii": 8,
    "ix": 9,
    "x": 10,
    "xi": 11,
    "xii": 12,
}
ALFREDO = (
    "Sauce Alfredo Land O'Lakes Bag(Skim Milk, Water, Cream, Cream Cheese "
    "(pasteurized milk and cream, cheese cultures, salt, guar gum, carob bean gum, "
    "xanthan gum), Parmesan Cheese (cultured milk, salt, enzymes), Romano Cheese "
    "(pasteurized cow's milk, cheese culture, salt, enzymes), Butter (cream, salt), "
    "Food Starch - Modified, Contains Less Than 2% of Maltodextrin, Salt, "
    "Natural Flavors, Sodium Phosphate, Sodium Citrate, Cellulose Gel, Cellulose Gum, "
    "Mono and Diglycerides, Spice.CONTAINS: Milk)"
)


def e_number_sort_key(e_number: str):
    """Numeric E-number, then letter, then roman suffix. E14XX sorts as 1499."""
    raw = e_number[1:].lower() if e_number.startswith("E") else e_number.lower()
    if re.fullmatch(r"\d+x+", raw):
        return (1499, "", 0, raw)
    match = re.match(r"(\d+)(.*)", raw)
    number = int(match.group(1))
    suffix = match.group(2)
    letter = ""
    roman = 0
    if suffix:
        if suffix[0] in "abcdefgh" and suffix not in ROMAN:
            letter = suffix[0]
            suffix = suffix[1:]
        if suffix:
            if suffix in ROMAN:
                roman = ROMAN[suffix]
            else:
                letter += suffix
    return (number, letter, roman, raw)


class IngredientFlagDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (DATA_DIR / "additives.json").open(encoding="utf-8") as handle:
            cls.additives = json.load(handle)
        with (DATA_DIR / "ingredient-watch.json").open(encoding="utf-8") as handle:
            cls.watch = json.load(handle)
        cls.by_id = {entry["id"]: entry for entry in cls.additives["entries"]}

    def test_files_are_the_real_datasets(self):
        self.assertTrue((DATA_DIR / "additives.json").is_file())
        self.assertTrue((DATA_DIR / "ingredient-watch.json").is_file())
        self.assertEqual(self.additives["schema_version"], 1)
        self.assertEqual(self.watch["schema_version"], 1)
        self.assertEqual(self.additives["retrieved_on"], "2026-11-18")
        self.assertEqual(self.watch["retrieved_on"], "2026-11-18")
        source_blob = json.dumps(self.additives["sources"])
        self.assertIn("https://static.openfoodfacts.org/data/taxonomies/additives.json", source_blob)
        self.assertIn("ODbL", source_blob)
        watch_blob = json.dumps(self.watch["sources"])
        self.assertIn("ODbL", watch_blob)
        self.assertIn("Curated by MaizeMeals", watch_blob)

    def test_entries_are_sorted_and_shaped(self):
        entries = self.additives["entries"]
        self.assertGreater(len(entries), 500)
        keys = [e_number_sort_key(entry["e_number"]) for entry in entries]
        self.assertEqual(keys, sorted(keys))
        numbers = [entry["e_number"] for entry in entries]
        self.assertLess(numbers.index("E170"), numbers.index("E170i"))
        self.assertLess(numbers.index("E170i"), numbers.index("E170ii"))
        self.assertLess(numbers.index("E1452"), numbers.index("E14XX"))
        self.assertLess(numbers.index("E14XX"), numbers.index("E1503"))
        allowed_concern = {"high", "moderate", "low", "unknown"}
        forbidden = {"salt", "water", "sugar", "oil", "starch", "spice", "natural flavor", "natural flavour"}
        for entry in entries:
            self.assertEqual(entry["kind"], "additive")
            self.assertIn(entry["concern"], allowed_concern)
            self.assertIn("E" + entry["e_number"][1:], entry["codes"])
            self.assertIn(entry["e_number"].replace("E", "", 1), entry["codes"])
            for name in entry["names"]:
                self.assertGreaterEqual(len(name), 3)
                self.assertNotIn(name, forbidden)
                self.assertEqual(name, name.lower())

    def test_sodium_nitrite_concern_comes_from_efsa_fields(self):
        # E250 is in the taxonomy. efsa_evaluation_overexposure_risk is en:high,
        # and both exposure-greater-than-ADI fields list population groups.
        entry = self.by_id["en:e250"]
        self.assertEqual(entry["e_number"], "E250")
        self.assertIn("sodium nitrite", entry["names"])
        self.assertEqual(entry["concern"], "high")
        self.assertIn("preservative", entry["classes"])
        self.assertIn("preservative", entry["flags"])
        self.assertIn("efsa-overexposure-high", entry["flags"])
        self.assertIn("exposure-above-adi", entry["flags"])
        self.assertTrue(
            any("efsa_evaluation_overexposure_risk is en:high" in reason for reason in entry["concern_reasons"])
        )
        self.assertTrue(
            any("efsa_evaluation_exposure_95th_greater_than_adi" in reason for reason in entry["concern_reasons"])
        )

    def test_color_and_preservative_flags_match_real_entries(self):
        # Red 40 / allura red is E129. The taxonomy sets
        # efsa_evaluation_overexposure_risk to en:no, so concern is low,
        # and the colour class still flags food-coloring.
        allura = self.by_id["en:e129"]
        self.assertIn("allura red", allura["names"])
        self.assertIn("red 40", allura["names"])
        self.assertIn("colour", allura["classes"])
        self.assertIn("food-coloring", allura["flags"])
        self.assertEqual(allura["concern"], "low")

        # Tartrazine / Yellow 5 is E102. An EFSA opinion is linked, but the
        # taxonomy has no efsa_evaluation_overexposure_risk and no
        # exposure-above-ADI value, so concern stays unknown.
        tartrazine = self.by_id["en:e102"]
        self.assertIn("tartrazine", tartrazine["names"])
        self.assertIn("yellow 5", tartrazine["names"])
        self.assertIn("food-coloring", tartrazine["flags"])
        self.assertEqual(tartrazine["concern"], "unknown")
        self.assertEqual(tartrazine["concern_reasons"], [])

        benzoate = self.by_id["en:e211"]
        self.assertIn("sodium benzoate", benzoate["names"])
        self.assertIn("preservative", benzoate["flags"])
        self.assertEqual(benzoate["concern"], "high")


class ScanIngredientsTest(unittest.TestCase):
    def test_sodium_nitrite_and_e_number_forms(self):
        hits = scan_ingredients("Cured with Sodium Nitrite (E-250)")
        nitrite = [hit for hit in hits if hit["id"] == "en:e250"]
        self.assertEqual(len(nitrite), 2)
        self.assertEqual(nitrite[0]["name"], "sodium nitrite")
        self.assertEqual(nitrite[0]["matched"], "Sodium Nitrite")
        self.assertEqual(nitrite[0]["concern"], "high")
        self.assertIn("preservative", nitrite[0]["flags"])
        self.assertEqual(nitrite[1]["name"], "E250")
        self.assertEqual(nitrite[1]["matched"], "E-250")
        for hit in nitrite:
            self.assertEqual(hit["kind"], "additive")
            self.assertIn("classes", hit)
            self.assertEqual(
                ["id", "kind", "name", "matched", "start", "end", "flags", "concern", "concern_reasons", "classes"],
                list(hit.keys()),
            )

        forms = scan_ingredients("E250, E-250, E 250, and e250")
        self.assertEqual([hit["matched"] for hit in forms], ["E250", "E-250", "E 250", "e250"])
        self.assertTrue(all(hit["id"] == "en:e250" for hit in forms))

    def test_e250_does_not_match_inside_a_longer_number(self):
        # E2500 is not an E-number in this taxonomy, and it must not be read as E250.
        self.assertEqual(scan_ingredients("code E2500"), [])
        self.assertFalse(any(hit["id"] == "en:e250" for hit in scan_ingredients("batch E25001")))
        hits = scan_ingredients("use E2500 or E250")
        e250 = [hit for hit in hits if hit["id"] == "en:e250"]
        self.assertEqual(len(e250), 1)
        self.assertEqual(e250[0]["matched"], "E250")

    def test_food_coloring_names_and_longest_match(self):
        yellow = scan_ingredients("Colored with Yellow 5 (tartrazine)")
        self.assertEqual([hit["id"] for hit in yellow], ["en:e102", "en:e102"])
        self.assertEqual(yellow[0]["name"], "yellow 5")
        self.assertEqual(yellow[0]["concern"], "unknown")
        self.assertIn("food-coloring", yellow[0]["flags"])
        self.assertEqual(yellow[1]["name"], "tartrazine")

        red = scan_ingredients("FD&C Red 40")
        self.assertEqual(len(red), 1)
        self.assertEqual(red[0]["id"], "en:e129")
        self.assertEqual(red[0]["name"], "fd and c red 40")
        self.assertEqual(red[0]["matched"], "FD&C Red 40")
        self.assertEqual(red[0]["concern"], "low")
        self.assertIn("food-coloring", red[0]["flags"])

        spaced = scan_ingredients("Red no. 40 lake")
        self.assertEqual(spaced[0]["name"], "red no 40")
        self.assertEqual(spaced[0]["matched"], "Red no. 40")
        self.assertIn("food-coloring", spaced[0]["flags"])

        longer = scan_ingredients("Allura Red AC")
        self.assertEqual(len(longer), 1)
        self.assertEqual(longer[0]["name"], "allura red ac")

    def test_plain_pantry_words_do_not_match(self):
        for text in ("milk", "water", "salt", "cream", "Milk, Water, Salt, Cream"):
            self.assertEqual(scan_ingredients(text), [], text)
        # "salt" must not fire inside "sodium", and "sodium" is not its own hit.
        self.assertEqual(scan_ingredients("sodium"), [])
        nitrite = scan_ingredients("sodium nitrite")
        self.assertEqual([hit["name"] for hit in nitrite], ["sodium nitrite"])
        self.assertNotIn("salt", [hit["name"] for hit in nitrite])

    def test_seed_oils_and_palm(self):
        hits = scan_ingredients("fried in soybean oil and vegetable oil")
        self.assertEqual([hit["name"] for hit in hits], ["soybean oil", "vegetable oil"])
        for hit in hits:
            self.assertEqual(hit["kind"], "seed-oil")
            self.assertEqual(hit["concern"], "moderate")
            self.assertEqual(hit["flags"], ["seed-oil"])
            self.assertTrue(any("Curated MaizeMeals watch list" in reason for reason in hit["concern_reasons"]))
            self.assertTrue(any("not a toxicity determination" in reason for reason in hit["concern_reasons"]))

        blend = scan_ingredients("vegetable oil blend")
        self.assertEqual(len(blend), 1)
        self.assertEqual(blend[0]["name"], "vegetable oil blend")

        palm = scan_ingredients("palm kernel oil")
        self.assertEqual([hit["id"] for hit in palm], ["watch:palm-kernel-oil"])
        self.assertEqual(palm[0]["kind"], "other")
        self.assertEqual(palm[0]["flags"], ["palm-oil"])
        self.assertEqual(scan_ingredients("palm oil")[0]["id"], "watch:palm-oil")
        self.assertEqual(scan_ingredients("soy oil")[0]["id"], "watch:soybean-oil")

    def test_alfredo_label_paragraph(self):
        hits = scan_ingredients(ALFREDO)
        names = [hit["name"] for hit in hits]
        self.assertEqual(names, sorted(names, key=lambda name: hits[names.index(name)]["start"]))
        self.assertEqual([hit["start"] for hit in hits], sorted(hit["start"] for hit in hits))
        self.assertIn("guar gum", names)
        self.assertIn("carob bean gum", names)
        self.assertIn("xanthan gum", names)
        self.assertIn("sodium phosphate", names)
        self.assertIn("sodium citrate", names)
        self.assertIn("cellulose gum", names)
        self.assertIn("mono and diglycerides", names)
        phosphate = next(hit for hit in hits if hit["name"] == "sodium phosphate")
        self.assertEqual(phosphate["concern"], "high")
        self.assertIn("preservative", phosphate["flags"])
        # Cellulose gel is not a separate taxonomy synonym; the word cellulose is E460.
        cellulose = next(hit for hit in hits if hit["name"] == "cellulose")
        self.assertEqual(cellulose["matched"], "Cellulose")
        matched_text = " ".join(hit["matched"].lower() for hit in hits)
        for absent in ("milk", "water", "salt", "cream", "maltodextrin", "natural flavors", "spice", "enzymes"):
            self.assertNotIn(absent, matched_text)
        # "Food Starch - Modified" does not contain the contiguous phrase "modified starch".
        self.assertNotIn("modified starch", names)


if __name__ == "__main__":
    unittest.main()
