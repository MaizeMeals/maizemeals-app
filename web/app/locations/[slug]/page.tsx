import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationMenu from "@/components/locations/slug/LocationMenu";
import { easternToday } from "@/lib/day-menu/scoring";
import { getLocationDirectory } from "@/lib/locations/directory";
import { defaultLocationMeal } from "@/lib/locations/default-meal";
import { loadLocationData } from "@/lib/locations/menu";
import { anonClient } from "@/lib/supabase/public";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

async function findHall(params: Props["params"]) {
  const { slug } = await params;
  const halls = await getLocationDirectory();
  return halls.find((hall) => hall.slug === slug) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hall = await findHall(params);
  const name = hall.display_name || hall.name;
  return {
    title: `${name} Menu & Hours | MaizeMeals`,
    description: `See the menu and serving hours for ${name} at the University of Michigan, with ingredients, nutrition, and student ratings.`,
    alternates: { canonical: `/locations/${hall.slug}` },
  };
}

export default async function LocationPage({ params, searchParams }: Props) {
  const [hall, query] = await Promise.all([findHall(params), searchParams]);
  const requested = Array.isArray(query.date) ? query.date[0] : query.date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    !Number.isNaN(Date.parse(requested)) && new Date(requested).toISOString().startsWith(requested)
    ? requested : easternToday();
  const data = await loadLocationData(anonClient(), hall, date);
  const initialMeal = defaultLocationMeal(Object.keys(data.menu), data.hours) ?? "Lunch";
  return <LocationMenu initialMeal={initialMeal} key={`${hall.slug}:${date}`} slug={hall.slug} initialDate={date} initialData={data} />;
}
