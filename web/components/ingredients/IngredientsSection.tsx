"use client";

import { Fragment, useMemo } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ADDITIVE_CATEGORIES, countByCategory, parseIngredientFlags } from "@/lib/ingredients";
import type { Item } from "@/types/dining";

type Props = {
  item: Pick<Item, "ingredients" | "ingredient_flags" | "allergens" | "label_notes">;
  /** Find food opens the drawer before the full record arrives. */
  loading?: boolean;
  className?: string;
};

/** Allergen chips + any non-allergen notes ("Item is deep fried"). */
export function AllergenChips({
  allergens,
  notes,
  className,
}: {
  allergens: readonly string[] | null | undefined;
  notes?: readonly string[] | null;
  className?: string;
}) {
  if (!allergens?.length && !notes?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {allergens?.length ? (
        <>
          <span className="text-xs font-semibold text-foreground">Contains</span>
          {allergens.map((a) => (
            <Badge key={a} variant="danger" shape="pill" className="py-0 text-[11px]">
              {a}
            </Badge>
          ))}
        </>
      ) : null}
      {notes?.map((n) => (
        <Badge key={n} variant="muted" shape="pill" className="py-0 text-[11px] font-medium">
          {n.replace(/^item is /i, "").replace(/^./, (c) => c.toUpperCase())}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Ingredients with every recognised additive highlighted by what it is
 * (seed oil, emulsifier, preservative, coloring, ...). Data: U-M NetNutrition
 * label + scraper/lib/ingredient_highlights.py.
 */
export function IngredientsSection({ item, loading = false, className }: Props) {
  const flags = useMemo(
    () => parseIngredientFlags(item.ingredient_flags, item.ingredients),
    [item.ingredient_flags, item.ingredients],
  );
  const counts = flags ? countByCategory(flags.spans) : [];

  const pieces = useMemo(() => {
    const text = item.ingredients ?? "";
    if (!text || !flags?.spans.length) return [{ text, span: null }];
    const out: { text: string; span: (typeof flags.spans)[number] | null }[] = [];
    let cursor = 0;
    for (const span of flags.spans) {
      if (span.start < cursor) continue;
      if (span.start > cursor) out.push({ text: text.slice(cursor, span.start), span: null });
      out.push({ text: text.slice(span.start, span.end), span });
      cursor = span.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), span: null });
    return out;
  }, [item.ingredients, flags]);

  return (
    <section aria-labelledby="ingredients-heading" className={cn("space-y-3", className)}>
      <h3 id="ingredients-heading" className="type-section-title">
        Ingredients
      </h3>

      {loading && !item.ingredients ? (
        <div className="space-y-2" aria-label="Loading ingredients">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : !item.ingredients ? (
        <p className="text-sm text-muted-foreground">
          Ingredients aren&apos;t published for this item yet.
        </p>
      ) : (
        <>
          <AllergenChips allergens={item.allergens} notes={item.label_notes} />

          {counts.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Additives found">
              {counts.map(({ category, count }) => (
                <span key={category} className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span className={cn("h-2 w-2 rounded-full", ADDITIVE_CATEGORIES[category].dot)} aria-hidden />
                  {count > 1 ? `${count} × ` : ""}
                  {ADDITIVE_CATEGORIES[category].label}
                </span>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Info className="h-3.5 w-3.5" aria-hidden /> No flagged additives or seed oils found.
            </p>
          )}

          <p className="text-sm leading-relaxed text-foreground/90">
            {pieces.map((piece, i) =>
              piece.span ? (
                <mark
                  key={i}
                  className={cn("rounded px-0.5 py-px", ADDITIVE_CATEGORIES[piece.span.category].mark)}
                  title={piece.span.label}
                >
                  {piece.text}
                </mark>
              ) : (
                <Fragment key={i}>{piece.text}</Fragment>
              ),
            )}
          </p>
        </>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
        From U-M NetNutrition. Recipes and suppliers change — always confirm allergens with dining staff.
      </p>
    </section>
  );
}
