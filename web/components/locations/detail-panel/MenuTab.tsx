import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Star, Flame, Camera, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MenuData, ItemMetadata } from "@/types/dining";
import { getStoragePhotoUrl } from "./PhotosDialog";

type Props = {
  loading: boolean;
  menu?: MenuData;
  itemMetadata?: Record<string, ItemMetadata>;
  /** Active venue slug for full menu / item deep links to `/locations/[slug]`. */
  venueSlug: string;
}

const PLACEHOLDER_IMAGE = "/images/food-placeholder.jpg";

export function MenuTab({ loading, menu, itemMetadata, venueSlug }: Props) {
  const router = useRouter();
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((itemId: string) => {
    setFailedImageIds((prev) => new Set(prev).add(itemId));
  }, []);

  // Resolve first photo to a display URL (storage path → Supabase URL, or keep local path)
  const getDisplayImageUrl = useCallback((photoPath: string | undefined): string => {
    if (!photoPath) return PLACEHOLDER_IMAGE;
    if (photoPath.startsWith("/")) return photoPath;
    const url = getStoragePhotoUrl(photoPath);
    return url || PLACEHOLDER_IMAGE;
  }, []);

  // Extract and sort real highlights using the decoupled metadata
  const getHighlights = () => {
    if (!menu || ! itemMetadata) return [];

    return Object.values(menu)
      .flat()
      .flatMap(g => g.items)
      .sort((a, b) => {
         // Safely grab metadata or default to 0
         const metaA = itemMetadata[a.id] || { avgRating: 0, reviewCount: 0, photos: [] };
         const metaB = itemMetadata[b.id] || { avgRating: 0, reviewCount: 0, photos: [] };

         // Sort by highest rating first, then by number of reviews to break ties
         if (metaB.avgRating !== metaA.avgRating) {
            return metaB.avgRating - metaA.avgRating;
         }
         return metaB.reviewCount - metaA.reviewCount;
      })
      .slice(0, 4);
  };

  const highlights = getHighlights();

  return (
    <div className="p-5">
       {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
       ) : (
          <>
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-1.5">
                 <Flame className="w-4 h-4 text-orange-500" />
                 <h3 className="font-semibold text-sm">Top Rated Today</h3>
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
                   highlights.map((item, i) => {
                      // Grab the metadata for this specific item
                      const meta = (itemMetadata && itemMetadata[item.id]) || { avgRating: 0, reviewCount: 0, photos: [] };

                      const displayImage = getDisplayImageUrl(meta.photos[0]);
                      const imageFailed = failedImageIds.has(item.id);
                      const showPlaceholder = imageFailed || !displayImage;

                      return (
                        <div
                          key={item.id || i}
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
                                   {meta.avgRating > 0 ? Number(meta.avgRating).toFixed(1) : "New"}
                                   <span className="text-muted-foreground opacity-60">
                                     ({meta.reviewCount})
                                   </span>
                                 </div>


                              </div>
                           </div>
                        </div>
                      );
                   })
                ) : (
                   <div className="text-center text-muted-foreground text-sm py-8 border rounded-xl bg-muted/20">
                      No menu items available today.
                   </div>
                )}
             </div>

          </>
       )}
    </div>
  )
}
