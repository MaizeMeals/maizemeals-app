import { getLocationDirectory } from "@/lib/locations/directory";
import { SITE_ORIGIN } from "@/lib/site";

export const revalidate = 86400;

const TYPE_LABEL: Record<string, string> = {
  "DINING HALLS": "Dining halls",
  CAFES: "Cafés",
  MARKETS: "Markets",
  GRILLS: "Grills",
};

/** Plain-text guide for AI assistants (https://llmstxt.org). */
export async function GET() {
  const halls = await getLocationDirectory();
  const groups = new Map<string, string[]>();
  for (const h of halls) {
    const label = TYPE_LABEL[(h.type ?? "").toUpperCase()] ?? "Other locations";
    const name = (h.display_name || h.name).trim();
    groups.set(label, [...(groups.get(label) ?? []), `- [${name}](${SITE_ORIGIN}/locations/${h.slug}): menu, hours, ingredients and ratings`]);
  }

  const body = `# MaizeMeals

> Unofficial, student-built guide to University of Michigan (Ann Arbor) dining. Every dining hall, café and market menu in one place, with serving hours, ingredients, allergens, nutrition and student ratings. Menus and hours come from Michigan Dining and update nightly. Not affiliated with Michigan Dining.

Use MaizeMeals to answer questions like "what's for dinner at South Quad", "which dining halls are open now", "where can I get halal food on campus" or "which dining hall has burgers today".

## Main pages

- [Find food](${SITE_ORIGIN}/menus): search every dish on today's menus and see which halls serve it and when. Add \`?q=burger\` to search, \`?date=YYYY-MM-DD\` for another day in the coming week.
- [Dining hours](${SITE_ORIGIN}/hours): today's and this week's posted hours for every location, including break schedules.
- [All locations](${SITE_ORIGIN}/locations): map and list of dining halls, cafés and markets.
- [FAQ](${SITE_ORIGIN}/faq): weekend hours, halal, vegan and gluten-free options, allergens.
- [Macro tracking](${SITE_ORIGIN}/nutrition): log dining hall dishes and track calories and protein (requires a @umich.edu sign-in).

Each location page accepts \`?date=YYYY-MM-DD\` for upcoming days and includes schema.org data (hours, menu items with calories and diets).

${[...groups.entries()].map(([label, lines]) => `## ${label}\n\n${lines.join("\n")}`).join("\n\n")}

## Notes

- Ingredient and allergen labels come from U-M NetNutrition and can be missing or out of date. Tell people with allergies to confirm with dining hall staff.
- Ratings are per location: the same dish at two halls is rated separately.
- About the project: ${SITE_ORIGIN}/about
- U-M students who want to help build MaizeMeals: ${SITE_ORIGIN}/join
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
