import type { Metadata } from "next";
import Link from "next/link";
import LocationsView from "@/components/locations/LocationsView";
import { getLocationDirectory } from "@/lib/locations/directory";

export const metadata: Metadata = {
  title: "U-M Dining Halls, Cafés & Markets | MaizeMeals",
  description: "Find University of Michigan dining locations and check each hall or café’s menu and hours.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const halls = await getLocationDirectory();
  return <>
    <LocationsView />
    <section className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold">U-M dining halls, cafés &amp; markets</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => <li key={hall.id}>
          <Link className="underline underline-offset-4" href={`/locations/${hall.slug}`}>
            {hall.display_name || hall.name}
          </Link>
        </li>)}
      </ul>
    </section>
  </>;
}
