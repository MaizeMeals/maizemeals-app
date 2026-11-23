import { serializeJsonLd } from "@/lib/seo/structured-data";

/** schema.org data for search engines and AI assistants. Invisible on the page. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
