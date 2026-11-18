"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { SectionHeader } from "@/components/layout/page-shell";
import { deleteAccount } from "@/app/actions/delete-account";
import { DELETE_CONFIRMATION_PHRASE } from "@/lib/account";
import { useAnalytics } from "@/hooks/use-analytics";
import { clearUserCaches } from "@/lib/pwa";
import { toast } from "@/lib/toast";

/** Local keys that belong to the person, not the device. */
const PERSONAL_STORAGE_KEYS = [
  "maize_guest_prefs",
  "maize_onboarding_completed",
  "mm_favorite_foods",
];

/**
 * "Danger zone" for /settings. Drop it in at the bottom of the page:
 *   <DeleteAccountSection />
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { track, reset } = useAnalytics();
  const matches = phrase.trim().toLowerCase() === DELETE_CONFIRMATION_PHRASE;

  const onConfirm = () =>
    startTransition(async () => {
      setError(null);
      track("account_delete_confirmed");
      const result = await deleteAccount(phrase);
      if (!result.success) {
        setError(result.error);
        return;
      }
      clearUserCaches();
      reset();
      for (const key of PERSONAL_STORAGE_KEYS) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* storage blocked */
        }
      }
      toast.success("Your account and data were deleted.");
      window.location.assign("/");
    });

  return (
    <section aria-labelledby="delete-account-heading" className="rounded-xl border border-destructive/40 p-4">
      <SectionHeader
        title={<span id="delete-account-heading">Delete account</span>}
        description="Permanently delete your MaizeMeals account and everything tied to it."
      />
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPhrase("");
            setError(null);
          }
        }}
      >
        <ResponsiveDialogTrigger asChild>
          <Button variant="destructive" onClick={() => track("account_delete_opened")}>
            <Trash2 className="h-4 w-4" /> Delete my account
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete your account?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>This can&apos;t be undone.</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-4 text-sm">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Your reviews and ratings (dish averages update)</li>
              <li>Photos you uploaded</li>
              <li>MaizeMacros goals and food log</li>
              <li>Saved favorites and preferences</li>
            </ul>
            <label className="block space-y-2">
              <span className="font-medium">
                Type <span className="font-mono">{DELETE_CONFIRMATION_PHRASE}</span> to confirm
              </span>
              <Input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(error)}
              />
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button variant="destructive" disabled={!matches || pending} onClick={onConfirm}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete permanently
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </section>
  );
}
