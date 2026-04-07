import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUserId } from "@/lib/supabase/admin";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { HEADER_HEIGHT } from "@/components/layout/constants";
import { cn } from "@/lib/utils";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUserId(user.id)) {
    redirect("/");
  }

  return (
    <div
      className="min-h-screen bg-background px-4 py-8 md:px-6"
      style={{ paddingTop: HEADER_HEIGHT }}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools and moderation for MaizeMeals.
        </p>

        <ul className="mt-8 flex flex-col gap-2">
          {ADMIN_SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4",
                  "shadow-sm transition-colors hover:bg-accent/50 hover:border-border",
                )}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">
                    {section.title}
                  </span>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
