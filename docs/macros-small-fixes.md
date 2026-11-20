# MaizeMacros: small fixes

> **Status: all ten items are done** (November 20, 2026, together with the larger MaizeMacros features: in-tracker add-food sheet, custom foods, recent foods and copy-day, "What to eat next", planning, week view and streak, CSV export, and the recommendation-boost fix). Don't pick these up; the list is kept for reference.

Small, independent fixes from the MaizeMacros (`/nutrition`) audit. Each item stands alone: do them in any order, one PR per item (or a few per PR).

**Ground rules**
- Branch from the latest `main`. **No database changes or migrations.** `cd web && npx tsc --noEmit && npx vitest run && npx next build` must pass.
- Read `docs/design-system.md` first. Use the shared primitives (`Button`, `Badge`, `Empty`, `ResponsiveDialog`, `toast` from `@/lib/toast`, `PageShell`/`PageHeader`); don't hand-roll new ones.
- **Keep changes small and local.** Larger MaizeMacros features (menu search inside the tracker, custom foods, "what to eat to hit my targets", weekly view, logging before setup) are being built separately and will touch `components/nutrition/MacroTracker.tsx` and `app/actions/macro-tracker.ts`. Don't restructure those files: add to them in place.
- **Don't change these files:** `web/lib/day-menu/*`, `web/components/menus/*`, `web/public/sw.js`, `supabase/**`.
- Check every change on a phone-sized viewport (390×844) and on desktop. The tracker requires sign-in: test with your own @umich.edu account.

Key files: `web/app/nutrition/page.tsx`, `web/components/nutrition/MacroTracker.tsx`, `web/components/nutrition/LogFoodDialog.tsx`, `web/components/nutrition/MacroWizard.tsx`, `web/app/actions/macro-tracker.ts`, `web/lib/nutrition.ts`.

---

## 1. One name: "MaizeMacros"
Today the feature is "Nutrition" (header nav), "Macros" (bottom nav), "MaizeMacros" (Settings, error messages), and "Macro Tracker" (page title and metadata).

- Page heading and `metadata.title` in `app/nutrition/page.tsx` / `MacroTracker.tsx` → **"MaizeMacros"**. Keep the small "Daily nutrition" eyebrow above it.
- Header nav label (`components/layout/HeaderContent.tsx`, the `/nutrition` link) → **"Macros"**, to match the bottom nav (`components/pwa/BottomNav.tsx`).
- The footer link (`components/layout/Footer.tsx`, "Nutrition") → **"Macros"**.
- Leave route paths (`/nutrition`) and analytics event names unchanged.

Acceptance criteria: the strings "Macro Tracker" and a `/nutrition` link labelled "Nutrition" don't appear anywhere in `web/` (`grep -rn "Macro Tracker" web/app web/components` returns nothing).

## 2. Type a serving amount
In `MacroTracker.tsx` → `FoodLogRow`, servings can only be changed with the ±0.25 buttons.

- Make the number between the buttons an editable input: `inputMode="decimal"`, about 4 characters wide, same look as now.
- Commit on blur and on Enter. Reject values ≤ 0 or > 100 (show `toast.error`, then restore the previous value). Round to 2 decimals.
- Keep the ± buttons. Don't fire a server update while the user is still typing.

Acceptance criteria: typing `1.5` and tabbing away updates the entry and the day totals. Typing `0` or `abc` restores the previous value with an error toast.

## 3. Undo for deleting a log entry
`FoodLogRow` deletes immediately, with no way back.

- On delete: remove the row from the UI right away (optimistic), and show `toast.success("Removed <item name>", { action: { label: "Undo", onClick } })`. `@/lib/toast` re-exports sonner's `toast`, so `action` works as documented by sonner.
- Only call `deleteFoodLogEntry` after about 5 seconds if Undo wasn't pressed. If Undo is pressed, put the row back in its original position and don't call the server.
- If the user navigates away or changes the date within those 5 seconds, run the pending delete then (don't lose it).
- If the delayed server delete fails, put the row back and show `toast.error`.

Acceptance criteria: delete → Undo within 5 s → the row is back and nothing changed in the database. Delete → wait → a refresh shows it gone.

## 4. No logging food on future dates
You can currently log food for next week.

- `LogFoodDialog.tsx`: give the date input `max={dateInEasternTime()}`.
- `app/actions/macro-tracker.ts` → `logFoodItem`: return `{ success: false, error: "You can't log food for a future date." }` if `consumedOn > dateInEasternTime()` (string comparison of `YYYY-MM-DD` is fine).
- `MacroTracker.tsx`: disable the "Next day" arrow when the selected date is today. Leave the date picker (`DateControls`) able to view past days.

Acceptance criteria: the next-day arrow is disabled on today. Calling `logFoodItem` with tomorrow's date returns the error. Past dates still work.

## 5. "Add food" goes to Find food
The tracker's "Add food" button and the empty state's "Browse campus menus" both link to `/locations`. Find food (`/menus`) is the item-based view and is faster for logging a dish.

- Point both links at `/menus`. Rename the empty-state button to **"Find food to log"**.
- Rewrite the empty-state copy: "Find a dish in Find food or on a dining hall's menu, open it, and tap **Add to log**."
- Rebuild that empty state with `components/ui/empty.tsx` (`Empty`, `EmptyMedia variant="icon"`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` for the button).

Acceptance criteria: both buttons open `/menus`, and the empty state uses the `Empty` primitive.

## 6. Show fiber, sugar, sodium and saturated fat for the day
Each `food_logs` row stores the dish's full nutrition label in `nutrition_snapshot` (same keys as `items.macronutrients`: `"Dietary Fiber"`, `"Sugars"`, `"Sodium"`, `"Saturated Fat"`), but the tracker only adds up four numbers.

- In `MacroTracker.tsx`, compute day totals for those four from `nutrition_snapshot × servings`. Missing or non-numeric values count as 0. Put the parsing in a small helper in `lib/nutrition.ts`, with a unit test in `lib/nutrition.test.ts` (create it).
- Show them under the four progress cards as a compact row (not cards): `Fiber 18g · Sugar 42g · Sodium 1,850mg · Sat fat 14g`. Use `text-sm text-muted-foreground` and `tabular-nums`.
- No targets for these. Optionally show sodium in the warning color above 2,300 mg and saturated fat above 20 g, with a `title` explaining the reference value.

Acceptance criteria: the totals match the sum over the day's entries. Entries without a snapshot don't break the row.

## 7. Over-target progress bars
`ProgressCard` in `MacroTracker.tsx` caps the bar at 100% and only the caption changes when you go over.

- When `value > goal`, keep the bar full but switch it to the warning color (`bg-orange-500`/`dark:bg-orange-400`, or the `warning` tokens in `docs/design-system.md`) and make the caption the same color.
- Protein over its goal is not a problem: for protein, keep the normal color and change the caption to "Goal reached".

Acceptance criteria: logging past the calorie goal shows an orange calorie bar. Going over protein shows "Goal reached" with no warning color.

## 8. Signed-out preview instead of a login wall
Signed-out visitors who tap **Macros** in the bottom nav land straight on `/login` with no explanation.

- In `app/nutrition/page.tsx`, when there's no user, render a preview instead of `redirect()`:
  - `PageShell` + `PageHeader` titled "MaizeMacros", description: "Track calories and macros from the dining hall menus you actually eat."
  - Three short points with icons: log any dish from campus menus in two taps; personal targets from a quick estimate (cut / maintain / bulk); your log stays private to your account.
  - A static, non-interactive mock of the four progress cards (reuse the `ProgressCard` look with sample numbers, `aria-hidden`).
  - Primary button "Sign in to start" → `/login?next=%2Fnutrition`, secondary "Browse menus" → `/menus`.
- Keep the `return_to` handling for signed-in users exactly as it is.

Acceptance criteria: signed out, `/nutrition` shows the preview (no redirect). Signed in, nothing changes.

## 9. Open the target editor directly from Settings
Settings → MaizeMacros → "Edit targets" (`app/settings/settings-panel.tsx`) links to `/nutrition`, which opens the day view, so the user still has to tap "Edit targets" again.

- Link it to `/nutrition?edit=targets`. In `app/nutrition/page.tsx`, read `edit` from `searchParams` and pass `startEditing` to `MacroTracker`, which then starts with `editingProfile = true` (the wizard opens on the final "Make the targets yours" step for users who already finished setup).
- After saving or cancelling, `router.replace("/nutrition")` so a refresh doesn't reopen the editor.

Acceptance criteria: Settings → Edit targets opens the target editor in one tap. Saving returns to the day view, and refreshing stays there.

## 10. Small accessibility fixes in the tracker
- The meal `<select>` in `FoodLogRow` already has an `aria-label`; give the ± buttons labels that include the item ("Increase servings of Scrambled Eggs").
- The progress cards: add `role="progressbar"` with `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={goal}`, and `aria-label` (e.g. "Protein 82 of 150 grams") on the bar element.
- The date shown next to the date picker on mobile (`md:hidden` span) should also be visible to screen readers on desktop: make sure `DateControls`' trigger has an accessible name that includes the selected date.

Acceptance criteria: an axe or Lighthouse accessibility pass on `/nutrition` (signed in) shows no "button has no accessible name" or "progressbar" issues.
