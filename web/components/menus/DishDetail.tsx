"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DetailDrawer, ItemDetailSidebar } from "@/components/locations/slug/DetailDrawer";
import { useAnalytics } from "@/hooks/use-analytics";
import { createClient } from "@/lib/supabase/client";
import { appGhostIconButtonClassName, appSurfaceOutlineButtonClassName } from "@/lib/button-styles";
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
};

type DishItemState = { item: ItemWithPhotos | null; loading: boolean; error: string | null };

/** Loads the full, location-specific item (nutrition label, approved photos). */
export function useDishItem(selection: DishSelection | null): DishItemState {
  const [state, setState] = useState<DishItemState>({ item: null, loading: false, error: null });

  useEffect(() => {
    if (!selection) {
      setState({ item: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ item: s.item?.id === selection.itemId ? s.item : null, loading: true, error: null }));
    createClient()
      .from("items")
      .select("*, photos ( storage_path, is_approved )")
      .eq("id", selection.itemId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ item: null, loading: false, error: "Couldn't load this dish. Try again." });
          return;
        }
        // Same shape the hall page builds: approved photos only.
        const { photos, ...rest } = data;
        const approved = (photos ?? [])
          .filter((p) => p.is_approved)
          .map((p) => ({ storage_path: p.storage_path }));
        setState({
          item: { ...rest, photos: approved.length ? approved : undefined, review_count: rest.review_count },
          loading: false,
          error: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selection]);

  return state;
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

function Placeholder({
  state,
  selection,
  onClose,
}: {
  state: DishItemState;
  selection: DishSelection;
  onClose?: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("absolute right-3 top-3", appGhostIconButtonClassName)}
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {state.loading ? (
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading dish" />
      ) : (
        <>
          <p>{state.error}</p>
          <ViewHallMenuButton selection={selection} />
        </>
      )}
    </div>
  );
}

const returnPath = () =>
  typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/menus";

/** Phones/tablets (< lg): the hall menu's bottom sheet. Render only below lg. */
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
  if (state.item && state.item.id === selection.itemId) {
    return (
      <DetailDrawer
        item={state.item}
        isOpen
        onClose={(open) => !open && onClose()}
        onStartReview={onStartReview}
        reviewsReturnPath={returnPath()}
        extraAction={<ViewHallMenuButton selection={selection} />}
      />
    );
  }
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl p-0">
        <SheetTitle className="sr-only">Dish details</SheetTitle>
        <Placeholder state={state} selection={selection} />
      </SheetContent>
    </Sheet>
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
  if (state.item && state.item.id === selection.itemId) {
    return (
      <ItemDetailSidebar
        item={state.item}
        onClose={onClose}
        onStartReview={onStartReview}
        reviewsReturnPath={returnPath()}
        extraAction={<ViewHallMenuButton selection={selection} />}
      />
    );
  }
  return <Placeholder state={state} selection={selection} onClose={onClose} />;
}
