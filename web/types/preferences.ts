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
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const DEFAULT_PREFERENCES = UserPreferencesSchema.parse({});
