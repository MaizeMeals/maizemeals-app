import type { MetadataRoute } from "next";
import { getLocationDirectory } from "@/lib/locations/directory";
import { SITE_ORIGIN } from "@/lib/site";
import { easternToday } from "@/lib/day-menu/scoring";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const halls = await getLocationDirectory();
  // Menus and hours change every day, so those pages are marked fresh daily.
  const today = easternToday();
  const daily = (path: string, priority: number): Entry => ({
    url: new URL(path, SITE_ORIGIN).href,
    lastModified: today,
    changeFrequency: "daily",
    priority,
  });
  const page = (path: string, priority: number): Entry => ({
    url: new URL(path, SITE_ORIGIN).href,
    changeFrequency: "monthly",
    priority,
  });

  return [
    daily("/", 1),
    daily("/menus", 0.9),
    daily("/hours", 0.9),
    daily("/locations", 0.8),
    ...halls.map((hall) => daily(`/locations/${hall.slug}`, 0.8)),
    { ...page("/faq", 0.6), lastModified: today, changeFrequency: "daily" },
    page("/nutrition", 0.6),
    page("/about", 0.4),
    page("/contact", 0.3),
    page("/privacy", 0.2),
    page("/terms", 0.2),
  ];
}
