import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Star, Flame, Camera, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { MenuData, ItemMetadata } from "@/types/dining";
import { getStoragePhotoUrl } from "./PhotosDialog";
import { FOOD_ITEM_PLACEHOLDER_IMAGE } from "@/lib/food-placeholder-image";
import { usePreferences } from "@/hooks/use-preferences";
import { itemMatchesDietaryFilters } from "@/lib/filter-utils";
import { compareItemsBySmartPreferences, itemPreferenceScore } from "@/lib/preference-scoring";

type Props = {
  loading: boolean;
  menu?: MenuData;
  itemMetadata?: Record<string, ItemMetadata>;
  /** Active venue slug for full menu / item deep links to `/locations/[slug]`. */
  venueSlug: string;
}

export function MenuTab({ loading, menu, itemMetadata, venueSlug }: Props) {
  const router = useRouter();
  const { preferences, loading: preferencesLoading } = usePreferences();
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((itemId: string) => {
    setFailedImageIds((prev) => new Set(prev).add(itemId));
  }, []);

  // Resolve first photo to a display URL (storage path → Supabase URL, or keep local path)
  const getDisplayImageUrl = useCallback((photoPath: string | undefined): string => {
    if (!photoPath) return FOOD_ITEM_PLACEHOLDER_IMAGE;
    if (photoPath.startsWith("/")) return photoPath;
    const url = getStoragePhotoUrl(photoPath);
    return url || FOOD_ITEM_PLACEHOLDER_IMAGE;
  }, []);

  // An item may be served at multiple meals. The highlights list represents
  // food concepts, so dedupe by item id before ranking across the full day.
  const highlights = useMemo(() => {
    if (!menu || !itemMetadata) return [];

    const uniqueItems = new Map(
      Object.values(menu)
      .flat()
      .flatMap(g => g.items)
      .map((item) => [item.id, item] as const),
    );

    return Array.from(uniqueItems.values())
      .filter((item) =>
        itemMatchesDietaryFilters(item, preferences.dietary_filters),
      )
      // Picks should be meals, not sauces, rolls, or condiments.
      .filter((item) => Number((item.macronutrients as Record<string, number> | null)?.["Calories"] ?? 0) >= 150)
      .sort((a, b) => {
         // Safely grab metadata or default to 0
         const metaA = itemMetadata[a.id] || { avgRating: 0, reviewCount: 0, photos: [] };
         const metaB = itemMetadata[b.id] || { avgRating: 0, reviewCount: 0, photos: [] };

         // Rated dishes first (highest, then most reviewed); the rest by
         // Smart Preferences so a hall with no reviews still shows good picks.
         if (metaB.avgRating !== metaA.avgRating) {
            return metaB.avgRating - metaA.avgRating;
         }
         if (metaB.reviewCount !== metaA.reviewCount) {
            return metaB.reviewCount - metaA.reviewCount;
         }
         const pref = compareItemsBySmartPreferences(a, b, preferences);
         // Smart Preferences ties alphabetically; prefer healthier, then more protein.
         const scoreA = itemPreferenceScore(a, preferences);
         const scoreB = itemPreferenceScore(b, preferences);
         if (scoreA !== scoreB) return pref;
         const mB = b.nutrition_score ?? 0;
         const mA = a.nutrition_score ?? 0;
         if (mB !== mA) return mB - mA;
         const protein = (it: typeof a) => Number((it.macronutrients as Record<string, number> | null)?.["Protein"] ?? 0);
         if (protein(b) !== protein(a)) return protein(b) - protein(a);
         return pref;
      })
      .slice(0, 5);
  }, [menu, itemMetadata, preferences]);

  const anyRated = highlights.some((item) => (itemMetadata?.[item.id]?.reviewCount ?? 0) > 0);

  return (
    <div className="p-5">
       {loading || preferencesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
       ) : (
          <>
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-1.5">
                 <Flame className="w-4 h-4 text-orange-500" />
                 <h3 className="font-semibold text-sm">{anyRated ? "Top rated today" : "Picks for you today"}</h3>
               </div>
               <Link
                 href={`/locations/${venueSlug}`}
                 className={cn(
                   "inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium",
                   "ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground",
                   "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                 )}
               >
                 Full Menu
               </Link>
             </div>

             <div className="flex flex-col gap-2">
                {highlights.length > 0 ? (
                   highlights.map((item) => {
                      // Grab the metadata for this specific item
                      const meta = (itemMetadata && itemMetadata[item.id]) || { avgRating: 0, reviewCount: 0, photos: [] };

                      const displayImage = getDisplayImageUrl(meta.photos[0]);
                      const imageFailed = failedImageIds.has(item.id);
                      const showPlaceholder = imageFailed || !displayImage || meta.photos.length === 0;

                      return (
                        <div
                          key={item.id}
                          role="link"
                          tabIndex={0}
                          onClick={() =>
                            router.push(
                              `/locations/${venueSlug}?item=${encodeURIComponent(item.id)}`,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(
                                `/locations/${venueSlug}?item=${encodeURIComponent(item.id)}`,
                              );
                            }
                          }}
                          className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-2 transition-colors hover:bg-muted/50"
                        >
                           {/* Thumbnail with fallback */}
                           <div className="h-12 w-12 shrink-0 relative bg-muted rounded-lg overflow-hidden border border-border/50">
                              {showPlaceholder ? (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                  <UtensilsCrossed className="w-6 h-6" />
                                </div>
                              ) : (
                                <Image
                                  src={displayImage}
                                  alt={item.name}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                  unoptimized={displayImage.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")}
                                  onError={() => handleImageError(item.id)}
                                />
                              )}
                              {/* Show camera icon indicator if we are displaying a user-submitted photo */}
                              {meta.photos.length > 0 && !showPlaceholder && (
                                <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded-sm p-0.5 backdrop-blur-sm">
                                  <Camera className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                           </div>

                           {/* Details */}
                           <div className="flex-1 min-w-0 py-0.5">
                              <div className="text-sm font-semibold truncate text-foreground">
                                {item.name}
                              </div>

                              <div className="flex items-center gap-3 mt-1">
                                 {/* Rating Badge */}
                                 <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                   <Star className="w-3 h-3 fill-current" />
                                   {meta.avgRating > 0 ? Number(meta.avgRating).toFixed(1) : "No ratings yet"}
                                   {meta.reviewCount > 0 ? (
                                     <span className="text-muted-foreground opacity-60">({meta.reviewCount})</span>
                                   ) : null}
                                 </div>


                              </div>
                           </div>
                        </div>
                      );
                   })
                ) : (
                   <Empty>
                     <EmptyHeader>
                       <EmptyMedia variant="icon">
                         <UtensilsCrossed />
                       </EmptyMedia>
                       <EmptyTitle>
                         {preferences.dietary_filters.length > 0
                           ? "No menu items match your dietary preferences today."
                           : "No menu items available today."}
                       </EmptyTitle>
                     </EmptyHeader>
                   </Empty>
                )}
             </div>

          </>
       )}
    </div>
  )
}
