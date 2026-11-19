"use client";

import { Ban } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { ADDITIVE_CATEGORIES } from "@/lib/ingredients";
import { AVOID_ADDITIVES, AVOID_ALLERGENS, avoidCount, type AvoidPrefs } from "@/lib/avoid";
import { cn } from "@/lib/utils";

const AVOID_ON = "border-destructive/60 bg-destructive/10 text-foreground";

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Allergens + additive categories to hide (saved to the profile / guest prefs). */
export function AvoidSection({ value, onChange }: { value: AvoidPrefs; onChange: (next: AvoidPrefs) => void }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Avoid</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Hides dishes whose U-M ingredient label lists these. Saved for every menu.
      </p>

      <p className="mb-2 text-xs font-semibold text-foreground">Allergens</p>
      <div className="flex flex-wrap gap-2">
        {AVOID_ALLERGENS.map((a) => (
          <Chip
            key={a.id}
            pressed={value.allergens.includes(a.id)}
            onPressedChange={() => onChange({ ...value, allergens: toggle(value.allergens, a.id) })}
            selectedClassName={AVOID_ON}
          >
            {value.allergens.includes(a.id) ? <Ban aria-hidden /> : null}
            {a.label}
          </Chip>
        ))}
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Additives &amp; oils</p>
      <div className="flex flex-wrap gap-2">
        {AVOID_ADDITIVES.map((c) => (
          <Chip
            key={c}
            pressed={value.additives.includes(c)}
            onPressedChange={() => onChange({ ...value, additives: toggle(value.additives, c) })}
            selectedClassName={AVOID_ON}
          >
            <span className={cn("h-2 w-2 rounded-full", ADDITIVE_CATEGORIES[c].dot)} aria-hidden />
            {ADDITIVE_CATEGORIES[c].label}
          </Chip>
        ))}
      </div>

      {avoidCount(value) > 0 ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--maize))]"
            checked={value.hide_unknown}
            onChange={(e) => onChange({ ...value, hide_unknown: e.target.checked })}
          />
          <span>
            <span className="font-semibold text-foreground">Hide dishes with unknown ingredients</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              About a third of dishes have no published label. By default they stay visible, marked
              &ldquo;Ingredients unknown&rdquo;.
            </span>
          </span>
        </label>
      ) : null}
    </section>
  );
}
