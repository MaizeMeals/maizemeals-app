// hooks/use-preferences.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  UserPreferencesSchema
} from "@/types/preferences";
import { toast } from "sonner";

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const supabase = createClient();

  // 1. Load Data on Mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // --- LOGGED IN: Fetch from DB ---
          setIsGuest(false);
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching profile:", error);
          }

          if (data) {
            const result = UserPreferencesSchema.safeParse(data);

            if (result.success) {
              setPreferences(result.data);
            } else {
              console.warn("Profile data mismatch, attempting safe merge:", result.error);

              // MANUALLY sanitize the dirty fields
              const safeFallback: UserPreferences = {
                ...DEFAULT_PREFERENCES,
                ...data, // Spread primitives (numbers, booleans) which are usually safe

                // 1. Force Arrays (Fixes: Json is not string[])
                dietary_filters: Array.isArray(data.dietary_filters)
                  ? (data.dietary_filters as string[])
                  : DEFAULT_PREFERENCES.dietary_filters,

                favorite_location_ids: Array.isArray(data.favorite_location_ids)
                  ? (data.favorite_location_ids as string[])
                  : DEFAULT_PREFERENCES.favorite_location_ids,

                // 2. Force Enums & Optionals (Fixes: null is not undefined)
                default_campus: (data.default_campus as UserPreferences['default_campus']) || undefined,
                last_played_at: data.last_played_at || undefined,
              };

              setPreferences(safeFallback);
            }
          }
        } else {
          // --- GUEST: Fetch from LocalStorage ---
          setIsGuest(true);
          const localData = localStorage.getItem("maize_guest_prefs");

          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              // Validate guest data too! (Protects against old/corrupt local storage)
              const result = UserPreferencesSchema.safeParse(parsed);

              if (result.success) {
                setPreferences(result.data);
              } else {
                // If local storage is garbage, reset it
                setPreferences(DEFAULT_PREFERENCES);
                localStorage.removeItem("maize_guest_prefs");
              }
            } catch (e) {
              console.error("Failed to parse local preferences", e);
              setPreferences(DEFAULT_PREFERENCES);
            }
          }
        }
      } catch (error) {
        console.error("Unexpected error loading preferences", error);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [supabase]);

  // 2. Universal Update Function
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      // Optimistic UI Update
      setPreferences((prev) => {
        // Zod check: Ensure we aren't saving invalid partial updates
        // (Optional but good practice if you have complex logic)
        const newPrefs = { ...prev, ...updates };

        // If Guest -> Save to LocalStorage immediately
        if (isGuest) {
          localStorage.setItem("maize_guest_prefs", JSON.stringify(newPrefs));
        }

        return newPrefs;
      });

      // If User -> Save to DB
      if (!isGuest) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("DB Save Error:", error);
          toast.error("Failed to save preferences");
          // Optionally revert state here if critical
        }
      }
    },
    [isGuest, supabase]
  );

  return { preferences, updatePreferences, loading, isGuest };
}
