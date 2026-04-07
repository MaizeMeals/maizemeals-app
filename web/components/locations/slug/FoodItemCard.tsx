import { Item } from "@/types/dining"
import { getDynamicTags } from "@/lib/filter-utils"
import { Stars } from "@/components/locations/detail-panel/Stars"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"
import { cn } from "@/lib/utils"

interface FoodItemCardProps {
  item: Item
  onClick?: () => void
  /** Brief highlight after deep-link scroll (e.g. `?item=id`). */
  highlight?: boolean
}

export function FoodItemCard({ item, onClick, highlight }: FoodItemCardProps) {
  const carbonTag = item.dietary_tags?.find(t => t.toLowerCase().startsWith('carbon'))
  const dynamicTags = getDynamicTags(item)
  const otherTags = Array.from(new Set([
    ...(item.dietary_tags?.filter(t => !t.toLowerCase().startsWith('carbon')) || []),
    ...dynamicTags
  ]))

  return (
    <div
      id={`menu-item-${item.id}`}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-start justify-between border-b border-border bg-card p-4 transition-colors last:border-0 active:bg-accent",
        highlight && "ring-2 ring-inset ring-maize bg-maize/10",
      )}
    >
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="font-bold text-foreground text-base leading-tight">{item.name}</h4>
        </div>

        <div className="flex items-center gap-3 text-sm mb-2">
          {item.avg_rating ? (
            <div className="flex items-center gap-2">
              <Stars rating={item.avg_rating} />
              <span className="font-semibold tabular-nums text-foreground">
                {item.avg_rating.toFixed(1)}
                {(item.review_count ?? 0) > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({item.review_count})
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No ratings</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
           {carbonTag && (
             <CarbonFootprint level={carbonTag.toLowerCase().replace('carbon', '') as any} />
           )}

           {otherTags.map(tag => (
             <DietaryTag key={tag} tag={tag} />
           ))}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <MScaleIndicator score={item.nutrition_score} />
      </div>
    </div>
  );
}
