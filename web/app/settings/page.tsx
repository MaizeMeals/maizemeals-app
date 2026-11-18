import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "./settings-panel";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Dietary dealbreakers, recommendation preferences, and your MaizeMeals account.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings");

  return <SettingsPanel email={user.email ?? null} />;
}
