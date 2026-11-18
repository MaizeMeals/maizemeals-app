"""Turn an ingredient paragraph into highlight spans for the app.

Every recognised additive is highlighted by *what it is* (emulsifier,
preservative, colour, ...), whether or not a regulator has graded it. On top of
``scan_ingredients`` (Open Food Facts additives + the seed/palm-oil watch list)
this adds a few processed ingredients the additive taxonomy doesn't cover
(modified starch, maltodextrin, "natural flavors", corn syrup, hydrogenated
oils) and skips fortification nutrients (riboflavin in enriched flour is a
vitamin there, not a dye).

Output shape (stored in items.ingredient_flags):
    {"categories": ["seed_oil", "preservative", ...],   # first-seen order
     "spans": [{"start": 0, "end": 11, "category": "seed_oil",
                "label": "Seed oil", "matched": "soybean oil"}, ...]}
Offsets index into the original ingredient string.
"""

from __future__ import annotations

import re

from lib.ingredient_flags import scan_ingredients

# Display order (also the order categories are summarised in the UI).
CATEGORIES = {
    "seed_oil": "Seed oil",
    "palm_oil": "Palm oil",
    "hydrogenated_oil": "Hydrogenated oil",
    "color": "Food coloring",
    "preservative": "Preservative",
    "emulsifier": "Emulsifier",
    "sweetener": "Sweetener",
    "flavoring": "Flavoring",
    "thickener": "Thickener / gum",
    "other": "Additive",
}

# Open Food Facts lists an additive's functional classes alphabetically, not by
# primary use, so pick by a fixed priority: gums/thickeners before emulsifier
# (xanthan, guar, carrageenan) and emulsifier before antioxidant (lecithin).
_CLASS_PRIORITY = [
    ("colour", "color"),
    ("preservative", "preservative"),
    ("sweetener", "sweetener"),
    ("flavour-enhancer", "flavoring"),
    ("thickener", "thickener"),
    ("stabiliser", "thickener"),
    ("gelling-agent", "thickener"),
    ("emulsifier", "emulsifier"),
    ("antioxidant", "preservative"),
]

# Common additives whose taxonomy classes mislead in a dining-hall label.
# Keyed by Open Food Facts id prefix -> (category, label).
_ID_OVERRIDES = {
    "en:e900": ("other", "Anti-foaming agent"),  # dimethylpolysiloxane
    "en:e500": ("other", "Leavening"),  # sodium bicarbonate / carbonates
    "en:e503": ("other", "Leavening"),
    "en:e341": ("other", "Leavening"),  # calcium phosphates
    "en:e450": ("other", "Leavening"),  # diphosphates (baking powder)
    "en:e551": ("other", "Anti-caking agent"),  # silicon dioxide
    "en:e535": ("other", "Anti-caking agent"),  # yellow prussiate of soda
    "en:e536": ("other", "Anti-caking agent"),
    "en:e538": ("other", "Anti-caking agent"),
    "en:e392": ("preservative", "Preservative"),  # rosemary extract (antioxidant)
    "en:e331": ("other", "Acidity regulator"),  # sodium citrates
    "en:e338": ("other", "Acidulant"),  # phosphoric acid
    "en:e270": ("other", "Acidity regulator"),  # lactic acid
    "en:e509": ("other", "Firming agent"),  # calcium chloride
    "en:e511": ("other", "Firming agent"),  # magnesium chloride (tofu)
    "en:e516": ("other", "Firming agent"),  # calcium sulfate (tofu)
    "en:e508": ("other", "Salt substitute"),  # potassium chloride
    "en:e432": ("emulsifier", "Emulsifier"),  # polysorbates
    "en:e433": ("emulsifier", "Emulsifier"),
    "en:e434": ("emulsifier", "Emulsifier"),
    "en:e435": ("emulsifier", "Emulsifier"),
    "en:e436": ("emulsifier", "Emulsifier"),
    "en:e471": ("emulsifier", "Emulsifier"),  # mono- and diglycerides
    "en:e472": ("emulsifier", "Emulsifier"),  # esters of mono-/diglycerides
}

# Fortification nutrients that share a name/E-number with a colour or
# antioxidant. In a dining-hall label they are added vitamins/minerals.
_FORTIFICANTS = re.compile(
    r"^(riboflavin|thiamin(e)?( mononitrate| hydrochloride)?|niacin(amide)?|folic acid|"
    r"reduced iron|ferrous \w+|vitamin [a-z0-9]+.*|pyridoxine.*|cholecalciferol|"
    r"beta[- ]?carotene)$",
    re.IGNORECASE,
)

# Processed ingredients the additive taxonomy doesn't list.
_EXTRAS = [
    (r"(?:modified (?:food |corn |tapioca |potato |wheat )?starch|food starch[\s,-]*modified)", "thickener", "Modified starch"),
    (r"maltodextrin", "other", "Filler"),
    # FD&C dyes written without a space ("blue1 lake") and generic "artificial color".
    (r"(?:fd&c )?(?:red|yellow|blue|green)\s?\d{1,2}(?: lake)?", "color", "Food coloring"),
    (r"artificial colou?rs?(?:ing)?", "color", "Food coloring"),
    (r"(?:vegetable )?mono[- ]?glycerides", "emulsifier", "Emulsifier"),
    (r"(?:natural|artificial)(?: and (?:natural|artificial))? flavou?r(?:s|ings?)?", "flavoring", "Flavoring"),
    (r"(?:smoke flavou?r(?:ing)?|liquid smoke)", "flavoring", "Flavoring"),
    (r"high[- ]fructose corn syrup", "sweetener", "High-fructose corn syrup"),
    (r"corn syrup(?: solids)?", "sweetener", "Corn syrup"),
    (r"(?:partially |fully )?hydrogenated(?: [a-z]+){0,3} oils?", "hydrogenated_oil", "Hydrogenated oil"),
    (r"(?:vegetable )?shortening", "hydrogenated_oil", "Shortening"),
    (r"tbhq|tert[- ]?butylhydroquinone", "preservative", "Preservative"),
    (r"dimethylpolysiloxane", "other", "Anti-foaming agent"),
]
_EXTRA_PATTERNS = [
    (re.compile(rf"(?<![A-Za-z0-9]){pattern}(?![A-Za-z0-9])", re.IGNORECASE), category, label)
    for pattern, category, label in _EXTRAS
]


def _override_for(hit_id: str) -> tuple[str, str] | None:
    for prefix, value in _ID_OVERRIDES.items():
        if hit_id.startswith(prefix):
            return value
    return None


def _category_for_hit(hit: dict) -> str | None:
    kind = hit.get("kind")
    hit_id = hit.get("id") or ""
    if hit_id.startswith("watch:"):
        # Curated oil watch list (palm entries have kind "other", seed oils "seed-oil").
        return "palm_oil" if "palm" in hit_id else "seed_oil"
    if kind == "seed-oil":
        return "seed_oil"
    if _FORTIFICANTS.match(hit.get("matched", "").strip()):
        return None
    override = _override_for(hit_id)
    if override:
        return override[0]
    classes = set(hit.get("classes") or [])
    flags = set(hit.get("flags") or [])
    for cls, category in _CLASS_PRIORITY:
        if cls in classes:
            return category
    if "food-coloring" in flags:
        return "color"
    if "preservative" in flags:
        return "preservative"
    if "sweetener" in flags:
        return "sweetener"
    return "other"


def highlight_ingredients(text: str | None) -> dict | None:
    """Return {"categories": [...], "spans": [...]} or None for empty text."""
    if not text or not text.strip():
        return None

    spans: list[dict] = []
    for hit in scan_ingredients(text):
        category = _category_for_hit(hit)
        if category is None:
            continue
        override = _override_for(hit.get("id") or "")
        end = hit["end"]
        matched = hit["matched"]
        # Taxonomy names like "paprika oleoresin (color" stop mid-parenthesis;
        # highlight just the ingredient, not the dangling "(color".
        if matched.count("(") > matched.count(")"):
            cut = matched.rstrip().rfind("(")
            matched = matched[:cut].rstrip()
            end = hit["start"] + len(matched)
            if not matched:
                continue
        spans.append({
            "start": hit["start"],
            "end": end,
            "category": category,
            "label": override[1] if override else CATEGORIES[category],
            "matched": matched,
        })

    for pattern, category, label in _EXTRA_PATTERNS:
        for match in pattern.finditer(text):
            start, end = match.start(), match.end()
            overlapping = [s for s in spans if s["start"] < end and start < s["end"]]
            # A longer extra phrase that fully contains scanner hits replaces
            # them ("partially hydrogenated cottonseed oil" > "cottonseed oil");
            # otherwise the scanner hit wins.
            if overlapping:
                if all(start <= s["start"] and s["end"] <= end for s in overlapping):
                    spans = [s for s in spans if s not in overlapping]
                else:
                    continue
            spans.append({
                "start": start,
                "end": end,
                "category": category,
                "label": label,
                "matched": match.group(0),
            })

    spans.sort(key=lambda s: (s["start"], -(s["end"] - s["start"])))
    # Drop any remaining overlaps, keeping the earliest/longest span.
    cleaned: list[dict] = []
    for span in spans:
        if cleaned and span["start"] < cleaned[-1]["end"]:
            continue
        cleaned.append(span)

    order = list(CATEGORIES)
    present = {s["category"] for s in cleaned}
    categories = [c for c in order if c in present]
    return {"categories": categories, "spans": cleaned}


# --- Allergens ---------------------------------------------------------------

_ALLERGENS = {
    "milk": "Milk", "dairy": "Milk",
    "egg": "Egg", "eggs": "Egg",
    "fish": "Fish",
    "shellfish": "Shellfish", "crustacean": "Shellfish", "crustacean shellfish": "Shellfish",
    "tree nut": "Tree nuts", "tree nuts": "Tree nuts", "treenut": "Tree nuts", "treenuts": "Tree nuts",
    "peanut": "Peanuts", "peanuts": "Peanuts",
    "wheat": "Wheat",
    "gluten": "Gluten",
    "wheat/barley/rye": "Gluten",
    "wheat, barley, rye": "Gluten",
    "barley": "Gluten",
    "rye": "Gluten",
    "soy": "Soy", "soybean": "Soy", "soybeans": "Soy", "soya": "Soy",
    "sesame": "Sesame", "sesame seed": "Sesame", "sesame seeds": "Sesame",
    "coconut": "Coconut",
}


def split_allergens(entries: list[str] | None) -> tuple[list[str], list[str]]:
    """Split a label's Contains entries into (allergens, notes).

    "Milk", "Tree Nuts" -> allergens; "Item is deep fried" -> notes.
    """
    allergens: list[str] = []
    notes: list[str] = []
    for raw in entries or []:
        text = re.sub(r"\s+", " ", (raw or "").strip().strip(".")).strip()
        if not text:
            continue
        key = text.lower()
        if key in _ALLERGENS:
            value = _ALLERGENS[key]
            if value not in allergens:
                allergens.append(value)
        elif text not in notes:
            notes.append(text)
    return allergens, notes
