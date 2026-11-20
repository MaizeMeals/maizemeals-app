import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, getAdminUserIds, isAdminUserId } from "@/lib/supabase/admin";

export type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Admin pages: signed-in user listed in ADMIN_USER_IDS, else redirect home.
 * Returns the service-role client (bypasses RLS, sees anonymous authors).
 */
export async function requireAdminPage(): Promise<{ me: User; admin: AdminClient }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUserId(user.id)) redirect("/");
  return { me: user, admin: createAdminClient() };
}

/** Same check for server actions: returns null instead of redirecting. */
export async function adminForAction(): Promise<{ me: User; admin: AdminClient } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUserId(user.id)) return null;
  return { me: user, admin: createAdminClient() };
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  uniqname: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  isAdmin: boolean;
  reviews: number;
  anonymousReviews: number;
  photos: number;
};

/** Every auth user (paged through the Admin API), newest first. */
async function allAuthUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

export function isBanned(bannedUntil: string | null | undefined): boolean {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

/** Directory of accounts with review/photo counts. Small enough to build in memory. */
export async function listUsers(admin: AdminClient): Promise<AdminUserRow[]> {
  const [authUsers, profiles, ratings, photos] = await Promise.all([
    allAuthUsers(admin),
    admin.from("user_profiles").select("user_id, display_name, uniqname, avatar_url"),
    admin.from("user_ratings").select("user_id, is_anonymous").not("user_id", "is", null),
    admin.from("photos").select("user_id").not("user_id", "is", null),
  ]);
  const profileById = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
  const reviewCount = new Map<string, { all: number; anon: number }>();
  for (const r of ratings.data ?? []) {
    const c = reviewCount.get(r.user_id!) ?? { all: 0, anon: 0 };
    c.all += 1;
    if (r.is_anonymous) c.anon += 1;
    reviewCount.set(r.user_id!, c);
  }
  const photoCount = new Map<string, number>();
  for (const p of photos.data ?? []) photoCount.set(p.user_id!, (photoCount.get(p.user_id!) ?? 0) + 1);

  return authUsers
    .map((u): AdminUserRow => {
      const profile = profileById.get(u.id);
      const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      return {
        id: u.id,
        email: u.email ?? null,
        name: profile?.display_name ?? meta.full_name ?? meta.name ?? null,
        uniqname: profile?.uniqname ?? null,
        avatarUrl: profile?.avatar_url ?? meta.avatar_url ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        bannedUntil: (u as User & { banned_until?: string | null }).banned_until ?? null,
        isAdmin: getAdminUserIds().includes(u.id),
        reviews: reviewCount.get(u.id)?.all ?? 0,
        anonymousReviews: reviewCount.get(u.id)?.anon ?? 0,
        photos: photoCount.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  editedAt: string | null;
  isAnonymous: boolean;
  userId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  itemId: string;
  itemName: string;
  hallName: string | null;
  hallSlug: string | null;
  photos: { id: string; storagePath: string; isApproved: boolean | null }[];
};

const REVIEW_SELECT = `
  id, rating, comment, created_at, edited_at, is_anonymous, user_id,
  items ( id, name, dining_halls ( name, slug ) ),
  photos ( id, storage_path, is_approved )
`;

type ReviewQueryRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  edited_at: string | null;
  is_anonymous: boolean;
  user_id: string | null;
  items: { id: string; name: string; dining_halls: { name: string; slug: string } | null } | null;
  photos: { id: string; storage_path: string; is_approved: boolean | null }[] | null;
};

function toAdminReview(r: ReviewQueryRow, authors: Map<string, { name: string | null; email: string | null }>): AdminReview {
  const author = r.user_id ? authors.get(r.user_id) : undefined;
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    isAnonymous: r.is_anonymous,
    userId: r.user_id,
    authorName: author?.name ?? null,
    authorEmail: author?.email ?? null,
    itemId: r.items?.id ?? "",
    itemName: r.items?.name ?? "Unknown item",
    hallName: r.items?.dining_halls?.name ?? null,
    hallSlug: r.items?.dining_halls?.slug ?? null,
    photos: (r.photos ?? []).map((p) => ({ id: p.id, storagePath: p.storage_path, isApproved: p.is_approved })),
  };
}

async function authorsFor(admin: AdminClient, userIds: string[]) {
  const ids = [...new Set(userIds)];
  const map = new Map<string, { name: string | null; email: string | null }>();
  if (!ids.length) return map;
  const { data: profiles } = await admin.from("user_profiles").select("user_id, display_name, uniqname").in("user_id", ids);
  for (const p of profiles ?? []) {
    map.set(p.user_id, { name: p.display_name, email: p.uniqname ? `${p.uniqname}@umich.edu` : null });
  }
  return map;
}

export type ReviewFilter = "all" | "anonymous" | "low" | "photos" | "deleted";

/** Recent reviews with their real authors (admins see through anonymity). */
export async function listReviews(admin: AdminClient, filter: ReviewFilter, limit = 100): Promise<AdminReview[]> {
  let query = admin.from("user_ratings").select(REVIEW_SELECT).order("created_at", { ascending: false }).limit(limit);
  if (filter === "anonymous") query = query.eq("is_anonymous", true);
  if (filter === "low") query = query.lte("rating", 2);
  if (filter === "deleted") query = query.is("user_id", null);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as ReviewQueryRow[];
  if (filter === "photos") rows = rows.filter((r) => (r.photos ?? []).length > 0);
  const authors = await authorsFor(admin, rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)));
  return rows.map((r) => toAdminReview(r, authors));
}

export type AdminUserDetail = {
  user: AdminUserRow & {
    provider: string | null;
    emailConfirmedAt: string | null;
  };
  profile: {
    onboardingCompleted: boolean;
    dietaryFilters: string[];
    avoid: { allergens: string[]; additives: string[]; hideUnknown: boolean } | null;
    healthFocus: number;
    proteinPriority: number;
    ratingSensitivity: number;
    favoriteLocations: number;
    streakCurrent: number;
    streakMax: number;
    profileUpdatedAt: string | null;
  } | null;
  counts: { foodLogs: number; favorites: number; lastFoodLogOn: string | null };
  reviews: AdminReview[];
};

export async function getUserDetail(admin: AdminClient, userId: string): Promise<AdminUserDetail | null> {
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) return null;
  const u = authData.user;

  const [profileRes, reviewsRes, logsRes, lastLogRes, favRes, photoCountRes] = await Promise.all([
    admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("user_ratings").select(REVIEW_SELECT).eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("food_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("food_logs").select("consumed_on").eq("user_id", userId).order("consumed_on", { ascending: false }).limit(1),
    admin.from("favorite_foods").select("food_key", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const p = profileRes.data;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const reviewRows = (reviewsRes.data ?? []) as unknown as ReviewQueryRow[];
  const name = p?.display_name ?? meta.full_name ?? meta.name ?? null;
  const authors = new Map([[userId, { name, email: u.email ?? null }]]);
  const avoid = p?.avoid_ingredients as { allergens?: string[]; additives?: string[]; hide_unknown?: boolean } | null;

  return {
    user: {
      id: u.id,
      email: u.email ?? null,
      name,
      uniqname: p?.uniqname ?? null,
      avatarUrl: p?.avatar_url ?? meta.avatar_url ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      bannedUntil: (u as User & { banned_until?: string | null }).banned_until ?? null,
      isAdmin: getAdminUserIds().includes(u.id),
      reviews: reviewRows.length,
      anonymousReviews: reviewRows.filter((r) => r.is_anonymous).length,
      photos: photoCountRes.count ?? 0,
      provider: (u.app_metadata?.provider as string | undefined) ?? null,
      emailConfirmedAt: u.email_confirmed_at ?? null,
    },
    profile: p
      ? {
          onboardingCompleted: p.onboarding_completed,
          dietaryFilters: Array.isArray(p.dietary_filters) ? (p.dietary_filters as string[]) : [],
          avoid: avoid
            ? { allergens: avoid.allergens ?? [], additives: avoid.additives ?? [], hideUnknown: Boolean(avoid.hide_unknown) }
            : null,
          healthFocus: p.health_focus,
          proteinPriority: p.protein_priority,
          ratingSensitivity: p.rating_sensitivity,
          favoriteLocations: p.favorite_location_ids?.length ?? 0,
          streakCurrent: p.streak_current,
          streakMax: p.streak_max,
          profileUpdatedAt: p.updated_at,
        }
      : null,
    counts: {
      foodLogs: logsRes.count ?? 0,
      favorites: favRes.count ?? 0,
      lastFoodLogOn: lastLogRes.data?.[0]?.consumed_on ?? null,
    },
    reviews: reviewRows.map((r) => toAdminReview(r, authors)),
  };
}

export type AdminStats = {
  users: number;
  newUsers7d: number;
  activeUsers7d: number;
  banned: number;
  reviews: number;
  reviews7d: number;
  anonymousShare: number;
  deletedAuthorReviews: number;
  pendingPhotos: number;
  menuThrough: string | null;
  ingredientCoverageToday: number | null;
};

export async function getStats(admin: AdminClient): Promise<AdminStats> {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const [users, reviews, reviews7d, anon, deleted, pending, latestMenu, todayItems] = await Promise.all([
    allAuthUsers(admin),
    admin.from("user_ratings").select("id", { count: "exact", head: true }),
    admin.from("user_ratings").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("user_ratings").select("id", { count: "exact", head: true }).eq("is_anonymous", true),
    admin.from("user_ratings").select("id", { count: "exact", head: true }).is("user_id", null),
    admin.from("photos").select("id", { count: "exact", head: true }).eq("is_approved", false),
    admin.from("menu_events").select("date").order("date", { ascending: false }).limit(1),
    admin.from("menu_events").select("items ( ingredients )").eq("date", today).limit(5000),
  ]);
  const total = reviews.count ?? 0;
  const itemsToday = (todayItems.data ?? []) as unknown as { items: { ingredients: string | null } | null }[];
  return {
    users: users.length,
    newUsers7d: users.filter((u) => (u.created_at ?? "") >= weekAgo).length,
    activeUsers7d: users.filter((u) => (u.last_sign_in_at ?? "") >= weekAgo).length,
    banned: users.filter((u) => isBanned((u as User & { banned_until?: string | null }).banned_until)).length,
    reviews: total,
    reviews7d: reviews7d.count ?? 0,
    anonymousShare: total ? (anon.count ?? 0) / total : 0,
    deletedAuthorReviews: deleted.count ?? 0,
    pendingPhotos: pending.count ?? 0,
    menuThrough: latestMenu.data?.[0]?.date ?? null,
    ingredientCoverageToday: itemsToday.length
      ? itemsToday.filter((r) => r.items?.ingredients).length / itemsToday.length
      : null,
  };
}
