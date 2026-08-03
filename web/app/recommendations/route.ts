import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { itemMatchesDietaryFilters } from "@/lib/filter-utils";
import { itemPreferenceScore } from "@/lib/preference-scoring";
import {
  DEFAULT_PREFERENCES,
  UserPreferencesSchema,
  type UserPreferences,
} from "@/types/preferences";
import type { Item } from "@/types/dining";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Smart Engine read path. It reads only menu data + the derived user profile;
 * raw food_logs intentionally never enter this request.
 */
export async function GET(request: NextRequest) {
  const hallId = request.nextUrl.searchParams.get("hall_id") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const meal = request.nextUrl.searchParams.get("meal");

  if (!UUID_REGEX.test(hallId) || !DATE_REGEX.test(date)) {
    return NextResponse.json({ error: "Valid hall_id and date are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let preferences: UserPreferences = DEFAULT_PREFERENCES;
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("dietary_filters, health_focus, protein_priority, rating_sensitivity, implicit_traits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[recommendations] profile load failed", profileError);
    } else if (profile) {
      const parsed = UserPreferencesSchema.safeParse({
        ...DEFAULT_PREFERENCES,
        ...profile,
      });
      if (parsed.success) preferences = parsed.data;
    }
  }

  let query = supabase
    .from("menu_events")
    .select(`
      *,
      items (
        *,
        photos ( storage_path, is_approved )
      )
    `)
    .eq("dining_hall_id", hallId)
    .eq("date", date);

  if (meal) query = query.eq("meal", meal);

  const { data: events, error } = await query;
  if (error) {
    console.error("[recommendations] menu load failed", error);
    return NextResponse.json({ error: "Could not load recommendations." }, { status: 500 });
  }

  const ranked = (events ?? [])
    .filter((event) => Boolean(event.items))
    .map((event) => {
      const item = event.items as Item;
      const passesHardFilters = itemMatchesDietaryFilters(
        item,
        preferences.dietary_filters,
      );
      return {
        ...event,
        // Approved formula: hard-filter violations are multiplied to zero.
        // They remain in the payload so a client can turn a filter off without
        // issuing another menu query; display surfaces still hide them.
        recommendation_score: passesHardFilters
          ? itemPreferenceScore(item, preferences)
          : 0,
      };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);

  return NextResponse.json({ events: ranked });
}
