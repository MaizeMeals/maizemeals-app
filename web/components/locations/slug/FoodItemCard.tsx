import { Star } from "lucide-react"
import { Item } from "@/types/dining"
import { getDynamicTags } from "@/lib/filter-utils"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"

interface FoodItemCardProps {
  item: Item
  onClick?: () => void
}

export function FoodItemCard({ item, onClick }: FoodItemCardProps) {
  const carbonTag = item.dietary_tags?.find(t => t.toLowerCase().startsWith('carbon'))
  const dynamicTags = getDynamicTags(item)
  const otherTags = Array.from(new Set([
    ...(item.dietary_tags?.filter(t => !t.toLowerCase().startsWith('carbon')) || []),
    ...dynamicTags
  ]))

  return (
    <div
      onClick={onClick}
      className="flex items-start justify-between p-4 bg-card border-b border-border active:bg-accent transition-colors cursor-pointer last:border-0"
    >
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="font-bold text-foreground text-base leading-tight">{item.name}</h4>
        </div>

        <div className="flex items-center gap-3 text-sm mb-2">
          {item.avg_rating ? (
             <div className="flex items-center gap-1 text-maize">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-semibold text-foreground">{item.avg_rating.toFixed(1)}</span>
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
