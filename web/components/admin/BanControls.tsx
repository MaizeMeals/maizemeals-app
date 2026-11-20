"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminSetBan, type BanLength } from "@/app/actions/admin";
import { toast } from "@/lib/toast";

export function BanControls({ userId, banned, disabled }: { userId: string; banned: boolean; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const run = (length: BanLength, label: string) =>
    startTransition(async () => {
      const res = await adminSetBan(userId, length);
      if (res.success) toast.success(label);
      else toast.error(res.error);
    });

  if (disabled) return <p className="text-xs text-muted-foreground">Admins can&apos;t be suspended here.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {banned ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("none", "Suspension lifted")}>
          Lift suspension
        </Button>
      ) : (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("day", "Suspended for 24 hours")}>
            Suspend 24h
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("week", "Suspended for 7 days")}>
            Suspend 7 days
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="border-destructive/40 text-red-600 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => run("forever", "Suspended indefinitely")}
          >
            Suspend indefinitely
          </Button>
        </>
      )}
    </div>
  );
}
