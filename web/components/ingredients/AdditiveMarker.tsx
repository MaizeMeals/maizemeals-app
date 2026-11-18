import { cn } from "@/lib/utils";
import { ADDITIVE_CATEGORIES, sortCategories } from "@/lib/ingredients";

/**
 * Compact "what's in it" marker for list rows: the first two additive
 * categories as colored dots + labels, then "+N".
 *   ● Seed oil  ● Preservative  +2
 */
export function AdditiveMarker({
  categories,
  className,
  max = 2,
}: {
  categories: readonly string[] | null | undefined;
  className?: string;
  max?: number;
}) {
  const sorted = sortCategories(categories ?? []);
  if (sorted.length === 0) return null;
  const shown = sorted.slice(0, max);
  const extra = sorted.length - shown.length;
  const all = sorted.map((c) => ADDITIVE_CATEGORIES[c].label).join(", ");

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground", className)}
      title={`Contains: ${all}`}
      aria-label={`Contains ${all}`}
    >
      {shown.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ADDITIVE_CATEGORIES[c].dot)} aria-hidden />
          {ADDITIVE_CATEGORIES[c].label}
        </span>
      ))}
      {extra > 0 && <span className="whitespace-nowrap">+{extra}</span>}
    </span>
  );
}
