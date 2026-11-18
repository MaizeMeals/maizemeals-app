"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SmartSlidersDialog } from "@/components/preferences/SmartSlidersDialog";
import { usePreferences } from "@/hooks/use-preferences";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

const DEALBREAKERS: { id: string; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "glutenfree", label: "Gluten-Free" },
];

export function SettingsPanel({ email }: { email: string | null }) {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [savingDiet, setSavingDiet] = useState(false);

  const toggleDealbreaker = async (id: string) => {
    if (loading || savingDiet) return;
    const current = preferences.dietary_filters;
    const next = current.includes(id)
      ? current.filter((filter) => filter !== id)
      : [...current, id];
    setSavingDiet(true);
    try {
      await updatePreferences({ dietary_filters: next });
    } finally {
      setSavingDiet(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-12 pt-28 md:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Settings
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {email ? (
          <>
            Signed in as <span className="text-foreground">{email}</span>.
          </>
        ) : (
          "Manage the preferences saved on your account."
        )}
      </p>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">
          Dietary dealbreakers
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vegetarian, Vegan, Halal, and Gluten-Free hide non-matching items on
          hall menus and recommendations. Other chips, such as Spicy, stay on
          the hall page where you turn them on.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Loading your saved preferences…
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {DEALBREAKERS.map(({ id, label }) => {
              const on = preferences.dietary_filters.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  disabled={savingDiet}
                  onClick={() => void toggleDealbreaker(id)}
                  className={cn(
                    "min-h-12 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
                    on
                      ? "border-maize bg-maize/20 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">
          Recommendation sliders
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These change how MaizeMeals ranks items. The same controls used on a
          hall menu are saved to your profile.
        </p>
        <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <dt>Health focus</dt>
            <dd className="tabular-nums text-foreground">
              {loading ? "…" : preferences.health_focus}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Protein priority</dt>
            <dd className="tabular-nums text-foreground">
              {loading ? "…" : preferences.protein_priority}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Rating sensitivity</dt>
            <dd className="tabular-nums text-foreground">
              {loading ? "…" : preferences.rating_sensitivity}
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          className={cn("mt-4 w-full sm:w-auto", appPrimaryButtonClassName)}
          disabled={loading}
          onClick={() => setSlidersOpen(true)}
        >
          Adjust sliders
        </Button>
        <SmartSlidersDialog
          open={slidersOpen}
          onOpenChange={setSlidersOpen}
          healthFocus={preferences.health_focus}
          proteinPriority={preferences.protein_priority}
          ratingSensitivity={preferences.rating_sensitivity}
          onSave={async (values) => {
            await updatePreferences(values);
          }}
        />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">MaizeMacros</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Calorie and macro targets live in the nutrition tracker. Open it to
          change what you are aiming for each day.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-4 w-full sm:w-auto"
        >
          <Link href="/nutrition">Edit targets</Link>
        </Button>
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">Sign out</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign out of MaizeMeals on this device.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <Button
            type="submit"
            variant="outline"
            className="w-full border-destructive/40 text-red-500 hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
          >
            Sign out
          </Button>
        </form>
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Account deletion is not available in the app yet because it has to be
          done with a service-role flow the owner is building.
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
