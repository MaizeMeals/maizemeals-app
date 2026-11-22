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
  return <LocationsView directory={
    <details className="border-t px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">All dining hall and café menus</summary>
      <ul className="mt-3 space-y-2">
        {halls.map((hall) => <li key={hall.id}>
          <Link className="text-sm underline underline-offset-4" href={`/locations/${hall.slug}`}>
            {hall.display_name || hall.name}
          </Link>
        </li>)}
      </ul>
    </details>
  } />;
}
