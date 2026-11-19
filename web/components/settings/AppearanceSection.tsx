"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "system", label: "Device", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] as const;

/** Light / dark / follow the device. Defaults to the device setting. */
export function AppearanceSection({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { track } = useAnalytics();
  // next-themes only knows the stored choice after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : null;

  return (
    <section className={cn("border-t border-border pt-8", className)}>
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Device follows your phone or computer&apos;s light/dark setting.
      </p>
      <div role="radiogroup" aria-label="Theme" className="mt-4 grid grid-cols-3 gap-3">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const on = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                if (id === current) return;
                track("theme_changed", { from_theme: current, to_theme: id });
                setTheme(id);
              }}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors",
                on
                  ? "border-maize bg-maize/20 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
