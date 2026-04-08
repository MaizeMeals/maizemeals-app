import { z } from "zod";

export const UserPreferencesSchema = z.object({
  // CORE PREFERENCES
  // .catch([]) ensures if DB returns null, we get an empty array
  dietary_filters: z.array(z.string()).catch([]),

  // .default(50) ensures we always have a value
  health_focus: z.number().min(0).max(100).default(50),
  protein_priority: z.number().min(0).max(100).default(50),
  rating_sensitivity: z.number().min(0).max(100).default(50),

  // SPATIAL / LOCATION
  // .nullable() allows null from DB, .transform turns it into undefined for React
  default_campus: z.enum(['NORTH', 'CENTRAL', 'HILL', 'OFF_CAMPUS']).nullable().optional(),

  favorite_location_ids: z.array(z.string().uuid()).catch([]),

  // GAMIFICATION
  streak_current: z.number().int().nonnegative().default(0),
  // Handles the "string | null" -> "string | undefined" conversion
  last_played_at: z.string().datetime().nullable().optional(),

  // METADATA
  onboarding_completed: z.boolean().default(false),

  // Synced from OAuth (user_profiles); optional for older rows / guests
  uniqname: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/** Fields the client may persist via `usePreferences` / merge (no identity columns). */
export const UserPreferencesUpdateSchema = UserPreferencesSchema.pick({
  dietary_filters: true,
  health_focus: true,
  protein_priority: true,
  rating_sensitivity: true,
  onboarding_completed: true,
  favorite_location_ids: true,
  default_campus: true,
  streak_current: true,
  last_played_at: true,
}).partial();

export type UserPreferencesUpdate = z.infer<typeof UserPreferencesUpdateSchema>;

export const DEFAULT_PREFERENCES = UserPreferencesSchema.parse({});

/** Guest full prefs blob (see `use-preferences` + merge). */
export const GUEST_PREFS_STORAGE_KEY = "maize_guest_prefs";

/** Guest Tier 1 onboarding ack (parallel to `onboarding_completed` in DB). */
export const GUEST_ONBOARDING_STORAGE_KEY = "maize_onboarding_completed";
