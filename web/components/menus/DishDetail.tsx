"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DetailDrawer, ItemDetailPanel } from "@/components/locations/slug/DetailDrawer";
import { ReviewModal } from "@/components/locations/detail-panel/ReviewModal";
import { useLgUp } from "@/hooks/use-lg-up";
import { useAnalytics } from "@/hooks/use-analytics";
import { createClient } from "@/lib/supabase/client";
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
};

/**
 * Location-specific item detail for Find food: the same panel the hall menu
 * uses (bottom sheet on phones, side panel on desktop), loaded with that
 * hall's version of the dish, plus "View full menu at {hall}".
 */
export function DishDetail({
  selection,
  onClose,
}: {
  selection: DishSelection | null;
  onClose: () => void;
}) {
  const lgUp = useLgUp();
  const { track } = useAnalytics();
  const [item, setItem] = useState<ItemWithPhotos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<ItemWithPhotos | null>(null);

  useEffect(() => {
    if (!selection) {
      setItem(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    supabase
      .from("items")
      .select("*, photos ( storage_path, is_approved )")
      .eq("id", selection.itemId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        setLoading(false);
        if (err || !data) {
          setError("Couldn't load this dish. Try again.");
          return;
        }
        // Same shape the hall page builds: approved photos only.
        const { photos, ...rest } = data;
        const approved = (photos ?? []).filter((p) => p.is_approved).map((p) => ({ storage_path: p.storage_path }));
        setItem({ ...rest, photos: approved.length ? approved : undefined, review_count: rest.review_count });
      });
    return () => {
      cancelled = true;
    };
  }, [selection]);

  if (!selection) return null;

  const params = new URLSearchParams({ item: selection.itemId });
  if (!selection.isToday) params.set("date", selection.date);
  const hallHref = `/locations/${selection.hallSlug}?${params.toString()}`;
  const returnPath =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/menus";

  const viewMenu = (
    <Button asChild size="lg" variant="outline" className={cn("w-full gap-2", appSurfaceOutlineButtonClassName)}>
      <Link
        href={hallHref}
        onClick={() => track("find_food_view_hall_menu_clicked", { hall: selection.hallSlug })}
      >
        View full menu at {selection.hallName}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );

  const review = reviewItem && (
    <ReviewModal
      itemId={reviewItem.id}
      itemName={reviewItem.name}
      open
      onOpenChange={(open) => !open && setReviewItem(null)}
    />
  );

  // Loading / error placeholder in the same container the panel will use.
  const placeholder = (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading dish" />
      ) : (
        <>
          <p>{error}</p>
          {viewMenu}
        </>
      )}
    </div>
  );

  if (!lgUp) {
    return (
      <>
        {item && item.id === selection.itemId ? (
          <DetailDrawer
            item={item}
            isOpen
            onClose={(open) => !open && onClose()}
            onStartReview={setReviewItem}
            reviewsReturnPath={returnPath}
            extraAction={viewMenu}
          />
        ) : (
          <Sheet open onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl p-0">
              <SheetTitle className="sr-only">Dish details</SheetTitle>
              {placeholder}
            </SheetContent>
          </Sheet>
        )}
        {review}
      </>
    );
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" hideClose className="flex w-[420px] flex-col p-0 sm:max-w-[420px]">
          <SheetTitle className="sr-only">{item?.name ?? "Dish details"}</SheetTitle>
          {item && item.id === selection.itemId ? (
            <ItemDetailPanel
              item={item}
              variant="sidebar"
              onClose={onClose}
              onStartReview={setReviewItem}
              reviewsReturnPath={returnPath}
              extraAction={viewMenu}
              className="h-full min-h-0"
            />
          ) : (
            placeholder
          )}
        </SheetContent>
      </Sheet>
      {review}
    </>
  );
}
