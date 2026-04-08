"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAIZE_PREFERENCES_MERGED_EVENT } from "@/lib/merge-guest-preferences";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  UserPreferencesSchema,
  UserPreferencesUpdateSchema,
  GUEST_PREFS_STORAGE_KEY,
  GUEST_ONBOARDING_STORAGE_KEY,
} from "@/types/preferences";
import { toast } from "@/lib/toast";

function readGuestOnboardingFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_ONBOARDING_STORAGE_KEY) === "true";
}

function parseProfileToPreferences(data: Record<string, unknown>): UserPreferences {
  const result = UserPreferencesSchema.safeParse(data);
  if (result.success) return result.data;

  const safeFallback: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...data,
    dietary_filters: Array.isArray(data.dietary_filters)
      ? (data.dietary_filters as string[])
      : DEFAULT_PREFERENCES.dietary_filters,
    favorite_location_ids: Array.isArray(data.favorite_location_ids)
      ? (data.favorite_location_ids as string[])
      : DEFAULT_PREFERENCES.favorite_location_ids,
    default_campus:
      (data.default_campus as UserPreferences["default_campus"]) || undefined,
    last_played_at: (data.last_played_at as string | null) || undefined,
  };
  return safeFallback;
}

export function usePreferences() {
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestTier1Done, setGuestTier1Done] = useState(false);

  const supabase = createClient();

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsGuest(false);
        setGuestTier1Done(false);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setPreferences(parseProfileToPreferences(data as Record<string, unknown>));
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } else {
        setIsGuest(true);
        const ack = readGuestOnboardingFlag();
        setGuestTier1Done(ack);

        const localData = localStorage.getItem(GUEST_PREFS_STORAGE_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData) as unknown;
            const result = UserPreferencesSchema.safeParse(parsed);
            if (result.success) {
              setPreferences({
                ...result.data,
                onboarding_completed:
                  ack || result.data.onboarding_completed,
              });
            } else {
              setPreferences(DEFAULT_PREFERENCES);
              localStorage.removeItem(GUEST_PREFS_STORAGE_KEY);
            }
          } catch (e) {
            console.error("Failed to parse local preferences", e);
            setPreferences(DEFAULT_PREFERENCES);
          }
        } else {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            onboarding_completed: ack,
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error loading preferences", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadPreferences();
    });
    return () => subscription.unsubscribe();
  }, [supabase, loadPreferences]);

  useEffect(() => {
    const onMerged = () => void loadPreferences();
    window.addEventListener(MAIZE_PREFERENCES_MERGED_EVENT, onMerged);
    return () =>
      window.removeEventListener(MAIZE_PREFERENCES_MERGED_EVENT, onMerged);
  }, [loadPreferences]);

  const needsTier1Onboarding = useMemo(() => {
    if (loading) return false;
    if (isGuest) return !guestTier1Done;
    return !preferences.onboarding_completed;
  }, [
    loading,
    isGuest,
    guestTier1Done,
    preferences.onboarding_completed,
  ]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const parsed = UserPreferencesUpdateSchema.safeParse(updates);
      if (!parsed.success) {
        console.warn("Invalid preference update:", parsed.error);
        toast.error("Invalid preference data");
        return;
      }

      const payload = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<UserPreferences>;

      if (Object.keys(payload).length === 0) return;

      setPreferences((prev) => {
        const newPrefs = { ...prev, ...payload };
        if (isGuest) {
          localStorage.setItem(
            GUEST_PREFS_STORAGE_KEY,
            JSON.stringify(newPrefs),
          );
          if (payload.onboarding_completed === true) {
            localStorage.setItem(GUEST_ONBOARDING_STORAGE_KEY, "true");
            setGuestTier1Done(true);
          }
        }
        return newPrefs;
      });

      if (!isGuest) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
          .from("user_profiles")
          .update(payload)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("DB Save Error:", error);
          toast.error("Failed to save preferences");
        }
      }
    },
    [isGuest, supabase],
  );

  return {
    preferences,
    updatePreferences,
    loading,
    isGuest,
    needsTier1Onboarding,
  };
}
