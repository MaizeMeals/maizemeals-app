import type { MetadataRoute } from "next";
import { getLocationDirectory } from "@/lib/locations/directory";
import { SITE_ORIGIN } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const halls = await getLocationDirectory();
  const paths = ["/", "/menus", "/locations", "/nutrition", "/about", "/faq", "/contact", "/privacy", "/terms"];
  return [...paths, ...halls.map((hall) => `/locations/${hall.slug}`)].map((path) => ({
    url: new URL(path, SITE_ORIGIN).href,
  }));
}
