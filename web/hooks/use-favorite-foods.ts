"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

/**
 * Saved favorite dishes, keyed by foodKey(name) (lib/day-menu/types.ts) so a
 * favorite applies at every location serving that dish.
 *
 * One shared store for the whole app (many hearts render at once):
 * - signed in: `favorite_foods` table (RLS: own rows only)
 * - guest: localStorage, merged into the account on sign-in
 */

const LOCAL_KEY = "mm_favorite_foods";

type Snapshot = { favorites: ReadonlyMap<string, string>; ready: boolean; signedIn: boolean };

let state: Snapshot = { favorites: new Map(), ready: false, signedIn: false };
let userId: string | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit(next: Partial<Snapshot>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function readLocal(): Map<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as [string, string][]) : [];
    return new Map(Array.isArray(parsed) ? parsed.filter((e) => Array.isArray(e) && e.length === 2) : []);
  } catch {
    return new Map();
  }
}

function writeLocal(map: ReadonlyMap<string, string>) {
  try {
    if (map.size) localStorage.setItem(LOCAL_KEY, JSON.stringify([...map]));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* storage blocked */
  }
}

async function load() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  userId = session?.user.id ?? null;

  if (!userId) {
    emit({ favorites: readLocal(), ready: true, signedIn: false });
    return;
  }

  // Merge favorites saved while signed out, then clear them locally.
  const local = readLocal();
  if (local.size) {
    const { error } = await supabase.from("favorite_foods").upsert(
      [...local].map(([food_key, display_name]) => ({ user_id: userId!, food_key, display_name })),
      { onConflict: "user_id,food_key", ignoreDuplicates: true },
    );
    if (!error) writeLocal(new Map());
  }

  const { data, error } = await supabase
    .from("favorite_foods")
    .select("food_key, display_name")
    .order("created_at", { ascending: false });
  if (error) console.error("[favorites] load failed", error);
  emit({
    favorites: new Map((data ?? []).map((r) => [r.food_key, r.display_name])),
    ready: true,
    signedIn: true,
  });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void load();
  createClient().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load();
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => state;

let guestNudged = false;

export function useFavoriteFoods() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(async (key: string, name: string) => {
    const was = state.favorites.has(key);
    const next = new Map(state.favorites);
    if (was) next.delete(key);
    else next.set(key, name);
    emit({ favorites: next }); // optimistic

    if (!userId) {
      writeLocal(next);
      if (!was && !guestNudged) {
        guestNudged = true;
        toast.info("Saved on this device. Sign in to keep favorites everywhere.");
      }
      return;
    }

    const supabase = createClient();
    const { error } = was
      ? await supabase.from("favorite_foods").delete().eq("user_id", userId).eq("food_key", key)
      : await supabase.from("favorite_foods").insert({ user_id: userId, food_key: key, display_name: name });
    if (error) {
      const reverted = new Map(state.favorites);
      if (was) reverted.set(key, name);
      else reverted.delete(key);
      emit({ favorites: reverted });
      toast.error("Couldn't update favorites. Try again.");
    }
  }, []);

  return {
    favorites: snap.favorites,
    isFavorite: (key: string) => snap.favorites.has(key),
    ready: snap.ready,
    signedIn: snap.signedIn,
    toggle,
  };
}
