import { easternMinutes, shiftRange } from "@/lib/day-menu/scoring";
import type { OperatingHour } from "@/types/dining";

/** Use the current serving window, or the closest posted start between meals. */
export function defaultLocationMeal(meals: string[], hours: OperatingHour[], now = new Date()) {
  const minutes = easternMinutes(now);
  let closest = meals[0] ?? null;
  let distance = Infinity;
  for (const meal of meals) {
    for (const hour of hours) {
      if (!hour.event_name?.toLowerCase().includes(meal.toLowerCase())) continue;
      const [start, end] = shiftRange({ start: hour.start_time, end: hour.end_time });
      if (minutes >= start && minutes < end) return meal;
      const difference = Math.abs(start - minutes);
      if (difference < distance) {
        closest = meal;
        distance = difference;
      }
    }
  }
  return closest;
}
