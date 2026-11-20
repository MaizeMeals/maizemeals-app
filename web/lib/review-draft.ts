/**
 * The review being written, kept in localStorage so it survives the browser
 * being killed while the phone camera or photo picker is open (common on
 * Android). Only one draft is kept. The photo itself is not stored.
 */

const KEY = "mm_review_draft";
/** Older drafts are ignored. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type ReviewDraft = {
  itemId: string;
  itemName: string;
  /** Where to send the user to finish it (opens the review sheet for the item). */
  resumeHref: string;
  rating: number;
  comment: string;
  anonymous: boolean;
  savedAt: number;
  /** Set once the "finish your review?" prompt has been shown. */
  prompted?: boolean;
};

export function readReviewDraft(): ReviewDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ReviewDraft;
    if (
      typeof draft?.itemId !== "string" ||
      typeof draft.resumeHref !== "string" ||
      !draft.resumeHref.startsWith("/") ||
      draft.resumeHref.startsWith("//") ||
      typeof draft.savedAt !== "number" ||
      Date.now() - draft.savedAt > MAX_AGE_MS
    ) {
      localStorage.removeItem(KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeReviewDraft(draft: Omit<ReviewDraft, "savedAt"> & { savedAt?: number }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: draft.savedAt ?? Date.now() }));
  } catch {
    // Private mode / blocked storage: no draft recovery.
  }
}

/** Remove the draft (only the one for `itemId`, when given). */
export function clearReviewDraft(itemId?: string) {
  try {
    if (itemId) {
      const current = readReviewDraft();
      if (current && current.itemId !== itemId) return;
    }
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
