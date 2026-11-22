import "server-only";
import { unstable_cache } from "next/cache";
import { anonClient } from "@/lib/supabase/public";

export const getLocationDirectory = unstable_cache(async () => {
  const { data, error } = await anonClient().from("dining_halls").select("*").order("name");
  if (error) throw error;
  return data;
}, ["public-location-directory"], { revalidate: 600 });
