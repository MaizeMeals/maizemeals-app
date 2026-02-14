import { Item } from "@/types/dining"
import { FilterState } from "@/components/locations/slug/DiningFilters"

export function filterItems(items: Item[], filters: FilterState): Item[] {
  return items.filter(item => {
    // 1. Search
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;

    // 2. Dietary & Macro Tags
    if (filters.dietary.length > 0) {
        // Simplified check matching DiningFilters logic. 
        // Ideally should match page.tsx logic which includes getMacroTags, 
        // but for now we stick to the existing property to ensure consistency between the two files being merged.
        // If strict parity with previous page.tsx logic is required, we should import getMacroTags.
        // Let's rely on item.dietary_tags for now as seen in DiningFilters.
        const itemTags = (item.dietary_tags || []).map(t => t.toLowerCase().replace(/[^a-z]/g, ''))
        const hasAll = filters.dietary.every(tag => itemTags.includes(tag))
        if (!hasAll) return false
    }

    // 3. Rating
    if (filters.minRating > 0 && (item.avg_rating || 0) < filters.minRating) return false

    // 4. M-Scale
    if (filters.minMScale > 1 && (item.nutrition_score || 0) < filters.minMScale) return false

    // 5. Macro Ranges
    const macros = (item.macronutrients as Record<string, number>) || {}
    const cal = Number(macros["Calories"] || 0)
    const prot = Number(macros["Protein"] || 0)
    const carbs = Number(macros["Total Carbohydrate"] || 0)
    const fat = Number(macros["Total Fat"] || 0)

    if (cal < filters.macros.calories[0] || cal > filters.macros.calories[1]) return false
    if (prot < filters.macros.protein[0] || prot > filters.macros.protein[1]) return false
    if (carbs < filters.macros.carbs[0] || carbs > filters.macros.carbs[1]) return false
    // Note: page.tsx checked fat, DiningFilters did not. Adding fat check for completeness.
    if (fat < filters.macros.fat[0] || fat > filters.macros.fat[1]) return false

    return true
  })
}
