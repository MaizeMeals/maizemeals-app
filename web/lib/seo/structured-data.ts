import { SITE_ORIGIN } from "@/lib/site";
import type { DiningHall, Item, LocationData, OperatingHour } from "@/types/dining";

/**
 * schema.org JSON-LD for search engines and AI assistants. Rendered as
 * <script type="application/ld+json">; see JsonLd below.
 */

type Json = Record<string, unknown>;

const DIETS: Record<string, string> = {
  vegan: "https://schema.org/VeganDiet",
  vegetarian: "https://schema.org/VegetarianDiet",
  halal: "https://schema.org/HalalDiet",
  kosher: "https://schema.org/KosherDiet",
  glutenfree: "https://schema.org/GlutenFreeDiet",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Keeps the JSON from closing the <script> tag early. */
export function serializeJsonLd(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function hallName(hall: Pick<DiningHall, "name" | "display_name">): string {
  return (hall.display_name || hall.name).trim();
}

export function hallPhotoUrl(hall: Pick<DiningHall, "image_url">): string {
  return new URL(`/images/dining_halls/${hall.image_url || "default.jpg"}`, SITE_ORIGIN).href;
}

function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

/** "07:00:00" → "07:00" (schema.org Time). */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MaizeMeals",
    url: `${SITE_ORIGIN}/`,
    description:
      "Unofficial, student-built guide to University of Michigan dining hall and café menus, hours, ingredients, nutrition and ratings.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_ORIGIN}/menus?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

function establishmentType(hall: Pick<DiningHall, "type">): string {
  const type = (hall.type ?? "").toUpperCase();
  if (type.includes("CAFE")) return "CafeOrCoffeeShop";
  if (type.includes("MARKET")) return "ConvenienceStore";
  return "FoodEstablishment";
}

function openingHours(weeklyHours: Record<string, OperatingHour[]>): Json[] {
  return Object.entries(weeklyHours).flatMap(([date, shifts]) =>
    shifts.map((shift) => ({
      "@type": "OpeningHoursSpecification",
      name: shift.event_name ?? undefined,
      dayOfWeek: `https://schema.org/${weekday(date)}`,
      opens: hhmm(shift.start_time),
      closes: hhmm(shift.end_time),
      validFrom: date,
      validThrough: date,
    })),
  );
}

function menuItem(item: Item): Json {
  const macros = (item.macronutrients ?? {}) as Record<string, unknown>;
  const calories = Number(macros["Calories"]);
  const protein = Number(macros["Protein"]);
  const diets = [...new Set((item.dietary_tags ?? []).map((t) => DIETS[t.toLowerCase().replace(/[^a-z]/g, "")]).filter(Boolean))];
  return {
    "@type": "MenuItem",
    name: item.name,
    ...(Number.isFinite(calories) && calories > 0
      ? {
          nutrition: {
            "@type": "NutritionInformation",
            calories: `${Math.round(calories)} calories`,
            ...(Number.isFinite(protein) ? { proteinContent: `${Math.round(protein)} g` } : {}),
            ...(item.serving_size ? { servingSize: item.serving_size } : {}),
          },
        }
      : {}),
    ...(diets.length ? { suitableForDiet: diets } : {}),
  };
}

/** One hall: address, hours for the coming week, and the day's menu by meal. */
export function hallJsonLd(hall: DiningHall, data: LocationData, date: string, maxItems = 80): Json {
  const url = `${SITE_ORIGIN}/locations/${hall.slug}`;
  let budget = maxItems;
  const sections = Object.entries(data.menu)
    .map(([meal, groups]) => {
      const items = groups.flatMap((g) => g.items).filter((it) => (it.item_type ?? "food") === "food");
      const shown = items.slice(0, Math.max(0, budget));
      budget -= shown.length;
      return shown.length ? { "@type": "MenuSection", name: meal, hasMenuItem: shown.map(menuItem) } : null;
    })
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": establishmentType(hall),
    "@id": `${url}#location`,
    name: hallName(hall),
    url,
    image: hallPhotoUrl(hall),
    ...(hall.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: hall.address,
            addressLocality: "Ann Arbor",
            addressRegion: "MI",
            addressCountry: "US",
          },
        }
      : {}),
    ...(hall.latitude != null && hall.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: hall.latitude, longitude: hall.longitude } }
      : {}),
    ...(hall.phone ? { telephone: hall.phone } : {}),
    parentOrganization: { "@type": "CollegeOrUniversity", name: "University of Michigan" },
    openingHoursSpecification: openingHours(data.weeklyHours),
    ...(sections.length
      ? { hasMenu: { "@type": "Menu", name: `${hallName(hall)} menu for ${date}`, hasMenuSection: sections } }
      : {}),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
