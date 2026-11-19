import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { SettingsPanel } from "./settings-panel";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Appearance, dietary dealbreakers, recommendation preferences, and your MaizeMeals account.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return <SettingsPanel email={user.email ?? null} />;

  // Signed out: appearance still works (it's stored on this device).
  return (
    <PageShell width="narrow">
      <PageHeader title="Settings" />
      <AppearanceSection className="mt-6" />
      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">Your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to save dietary dealbreakers, ranking preferences, favorites,
          and your food log.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild className={appPrimaryButtonClassName}>
            <Link href="/signup?next=/settings">Sign up</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login?next=/settings">Log in</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
