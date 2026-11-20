"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { readReviewDraft, writeReviewDraft } from "@/lib/review-draft";

/**
 * On app start, offer to finish a review the browser lost (Android can kill
 * it while the camera or photo picker is open). Shown once per draft.
 */
export function ReviewDraftResume() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readReviewDraft();
      if (!draft || draft.prompted) return;
      // Already on the page that reopens it.
      if (new URLSearchParams(window.location.search).get("review") === draft.itemId) return;

      const markPrompted = () => {
        const current = readReviewDraft();
        if (current && current.itemId === draft.itemId) {
          writeReviewDraft({ ...current, prompted: true });
        }
      };
      markPrompted();
      toast("Finish your review?", {
        description: `You were reviewing ${draft.itemName}.`,
        duration: 15000,
        action: {
          label: "Finish",
          onClick: () => router.push(draft.resumeHref),
        },
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
