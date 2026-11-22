"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailDrawer, ItemDetailSidebar } from "@/components/locations/slug/DetailDrawer";
import { useAnalytics } from "@/hooks/use-analytics";
import { createClient } from "@/lib/supabase/client";
import { catalogQuery } from "@/lib/catalog-query";
import { appSurfaceOutlineButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import type { ItemWithPhotos } from "@/types/dining";

/** The location row the user tapped in Find food. */
export type DishSelection = {
  itemId: string;
  hallName: string;
  hallSlug: string;
  /** YYYY-MM-DD; only added to the hall link when it isn't today. */
  date: string;
  isToday: boolean;
  /**
   * The dish as Find food already has it (full label, no photos). The drawer
   * opens with this immediately and swaps in the fetched record in place, so
   * the sheet animates open once instead of placeholder → close → reopen.
   */
  provisional: ItemWithPhotos;
};

type DishItemState = { item: ItemWithPhotos | null; loading: boolean; error: string | null };

async function fetchDishItem(itemId: string): Promise<ItemWithPhotos> {
  const { data, error } = await createClient()
    .from("items")
    .select("*, photos ( storage_path, is_approved )")
    .eq("id", itemId)
    .single();
  if (error || !data) {
    console.error("[DishDetail] item load failed", error);
    throw new Error("Couldn't load details for this dish.");
  }
  const { photos, ...rest } = data;
  const approved = (photos ?? [])
    .filter((photo) => photo.is_approved)
    .map((photo) => ({ storage_path: photo.storage_path }));
  return {
    ...rest,
    photos: approved.length ? approved : undefined,
    review_count: rest.review_count,
  };
}

/** Loads the full, location-specific item (nutrition label, approved photos). */
export function useDishItem(selection: DishSelection | null): DishItemState {
  return useItemDetails(selection?.provisional ?? null);
}

export function useItemDetails(provisional: ItemWithPhotos | null): DishItemState {
  const query = useQuery({
    queryKey: ["menu-item", provisional?.id],
    queryFn: () => fetchDishItem(provisional!.id),
    enabled: Boolean(provisional),
    ...catalogQuery,
  });

  if (!provisional) return { item: null, loading: false, error: null };
  return {
    item: query.data ?? provisional,
    loading: !query.data && query.isFetching,
    error: query.isError ? "Couldn't load details for this dish." : null,
  };
}

function hallHref(selection: DishSelection) {
  const params = new URLSearchParams({ item: selection.itemId });
  if (!selection.isToday) params.set("date", selection.date);
  return `/locations/${selection.hallSlug}?${params.toString()}`;
}

function ViewHallMenuButton({ selection }: { selection: DishSelection }) {
  const { track } = useAnalytics();
  return (
    <Button asChild size="lg" variant="outline" className={cn("w-full gap-2", appSurfaceOutlineButtonClassName)}>
      <Link
        href={hallHref(selection)}
        onClick={() => track("find_food_view_hall_menu_clicked", { hall: selection.hallSlug })}
      >
        View full menu at {selection.hallName}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

const returnPath = () =>
  typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/menus";

/** The fetched record once it's for this selection, else the provisional dish. */
function displayItem(selection: DishSelection, state: DishItemState): ItemWithPhotos {
  return state.item && state.item.id === selection.itemId ? state.item : selection.provisional;
}

/**
 * Phones/tablets (< lg): the hall menu's bottom sheet. Render only below lg.
 * Always one DetailDrawer instance — content updates in place when the fetch
 * resolves, so the sheet animates open exactly once.
 */
export function DishDrawer({
  selection,
  state,
  onClose,
  onStartReview,
}: {
  selection: DishSelection | null;
  state: DishItemState;
  onClose: () => void;
  onStartReview: (item: ItemWithPhotos) => void;
}) {
  if (!selection) return null;
  return (
    <DetailDrawer
      item={displayItem(selection, state)}
      isOpen
      onClose={(open) => !open && onClose()}
      onStartReview={onStartReview}
      reviewsReturnPath={returnPath()}
      extraAction={<ViewHallMenuButton selection={selection} />}
      ingredientsLoading={state.loading}
    />
  );
}

/**
 * Desktop (lg+): the hall menu's inline side panel. Place it inside the
 * page's sticky <aside> so the content shifts over instead of being covered.
 */
export function DishSidebar({
  selection,
  state,
  onClose,
  onStartReview,
}: {
  selection: DishSelection;
  state: DishItemState;
  onClose: () => void;
  onStartReview: (item: ItemWithPhotos) => void;
}) {
  return (
    <ItemDetailSidebar
      item={displayItem(selection, state)}
      onClose={onClose}
      onStartReview={onStartReview}
      reviewsReturnPath={returnPath()}
      extraAction={<ViewHallMenuButton selection={selection} />}
      ingredientsLoading={state.loading}
    />
  );
}
