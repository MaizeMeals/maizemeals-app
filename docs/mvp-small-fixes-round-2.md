# MVP small fixes: round 2 (design consistency and polish)

Follow-up to `docs/mvp-easy-fixes.md`. These are mostly mechanical changes that make the existing UI match `docs/design-system.md`. **Read that file first.**

**Ground rules**
- Same as round 1: branch from the latest `claude/maizemeals-mvp-audit-2xr328`, make no database changes, and `npx tsc --noEmit && npx next build` must pass.
- **Use the shared primitives.** Don't hand-roll replacements. Add any missing shadcn component with `cd web && npx shadcn@latest add <name>`, and never pass `--overwrite`, because the existing `ui/*` files are customized.
- **Don't change these files.** They're owned by the feature agent:
  `web/components/menus/*`, `web/lib/day-menu/*`, `web/components/pwa/*`, `web/components/ui/{responsive-dialog,chip,search-field,badge}.tsx`, `web/components/layout/page-shell.tsx`, `web/public/sw.js`.
- **Behaviour must not change** unless an item says so. Check each change on a phone-sized viewport and on desktop.

---

## 1. Move every hand-built modal to `ResponsiveDialog`
These files each build their own Radix Dialog, with inconsistent overlays, z-index (`z-50`, `z-[70]`, `z-[9999]`) and radii:

| File | Notes |
| --- | --- |
| `components/locations/detail-panel/ReviewModal.tsx` | Keep the photo compression flow |
| `components/reviews/EditReviewDialog.tsx` | |
| `components/locations/slug/ReviewItemPickerModal.tsx` | |
| `components/locations/slug/FilterDialog.tsx` | Full-height on mobile today; a drawer is better |
| `components/locations/slug/DateControls.tsx` | Mobile dialog branch only; keep the desktop popover |
| `components/preferences/SmartSlidersDialog.tsx` | |
| `components/nutrition/LogFoodDialog.tsx` | Uses `z-[70]/[71]`; remove them |
| `components/locations/slug/MScaleIndicator.tsx` | Uses `z-[9999]`; remove it |
| `components/locations/detail-panel/PhotosDialog.tsx` | Photo viewer: use plain `Dialog` (full-screen), not a drawer |

Acceptance criteria:
- Every modal has a `ResponsiveDialogTitle` (`sr-only` is fine).
- Escape and swipe-down close it.
- No arbitrary z-index values remain.
- Focus returns to the trigger on close.

## 2. Accessible names for icon-only buttons
Several icon buttons have no accessible name; an automated test couldn't find the filter button by role. Add `aria-label` (or check for an existing `sr-only` span) to:
- `components/locations/slug/FilterDialog.tsx`: the trigger button
- `components/locations/slug/DateControls.tsx`: the trigger (mobile + desktop)
- `components/locations/detail-panel/LocationDetailPanel.tsx`: lines ~199 and ~219
- `components/locations/LocationsView.tsx`: ~483
- `components/nutrition/MacroTracker.tsx`: previous/next day buttons (~307, ~321) → "Previous day" / "Next day"
- `components/layout/theme-toggle.tsx`

## 3. User menu → shadcn `DropdownMenu`
`components/layout/UserNav.tsx` builds its own dropdown with a click-outside handler. It has no keyboard navigation, focus trap or Escape handling.
- `npx shadcn@latest add dropdown-menu`, then rebuild the menu with it. Keep: Settings link, Admin link (pass `isAdmin` from `Header` → `HeaderContent` → `UserNav`), and Log out (keep calling `clearUserCaches()` and `reset()`).
- Once Admin lives in the user menu, remove the mobile hamburger from `HeaderContent.tsx`; it now only exists for admins.

## 4. Status, rating and match pills → `Badge`
Replace hand-styled pills with `Badge` variants (`success` / `warning` / `danger` / `muted` / `maize` / `maize-soft`, `shape="pill"`):
- `components/locations/LocationListCard.tsx`: the open/closed status pill (uses `STATUS_COLORS`), the "BUSY" pill, the retail rating pill
- `components/locations/slug/LocationHero.tsx`: the status pill
- `components/locations/slug/FoodItemCard.tsx`: rating text
- `components/locations/detail-panel/OverviewTab.tsx`: status pills, if any

Then make `STATUS_COLORS` in `lib/dining/constants.ts` map to badge variant names instead of class strings, and update its callers.

## 5. Empty states → `Empty`
Use `components/ui/empty.tsx` (with `EmptyMedia variant="icon"`) for:
- `app/locations/[slug]/page.tsx`: "It seems like there isnt any menu for today" (also fix the typo and say "No menu posted for this day"), and "No menu items matching your filters" (keep the Clear Filters action in `EmptyContent`)
- `components/locations/LocationsView.tsx`: "No locations found."
- `components/locations/detail-panel/MenuTab.tsx`: the no-items message
- `app/reviews/page.tsx`: no reviews yet

## 6. Pages → `PageShell` / `PageHeader`
Replace per-page top padding (`pt-24`, `style={{ paddingTop: HEADER_HEIGHT }}`, etc.) and ad-hoc `h1`s:
- `components/nutrition/MacroTracker.tsx`, `components/nutrition/MacroWizard.tsx`
- `app/admin/page.tsx`, `app/admin/photos/page.tsx` (use `width="wide"`)
- `app/privacy/page.tsx`, `app/terms/page.tsx` (use `width="narrow"`)
- `app/reviews/page.tsx`
- Round-1 pages: `/settings`, `/about`, `/faq`, `/contact`

## 7. Colours → tokens
Replace raw `slate/gray/zinc/neutral/stone` classes with semantic tokens (`bg-muted`, `text-muted-foreground`, `border-border`, …):
- `components/auth/AuthPage.tsx`, `components/landing/{CTA,DiningHallGrid,Hero}.tsx`
- `components/locations/{ClusterPin,LocationMap}.tsx`, `components/locations/slug/{LocationHero,MacroHistogram}.tsx`
- `components/locations/slug/filters/MacroSection.tsx`, `components/ui/dual-slider.tsx`, `components/wheel-picker/wheel-picker.tsx`

Exception: overlays on photos or video (hero) may keep `white/black` with opacity. Check dark mode after each file.

## 8. Radius scale
Apply the scale from `docs/design-system.md`: cards `rounded-xl`, pills `rounded-full`, small tags `rounded-md`. The main offenders are `rounded-lg` and `rounded-md` on cards, and `rounded-2xl` on cards. Don't change dialogs; item 1 handles those.

## 9. Delete the duplicate dining helpers
`lib/dining-utils.ts` duplicates `lib/dining/*`, including `determineHallStatus` (two diverging copies) and `formatTime`.
- Move its importers to `@/lib/dining`: `components/locations/slug/MenuTabs.tsx`, `components/locations/slug/LocationHero.tsx`, `components/landing/DiningCard.tsx`, `hooks/use-campus-locations.ts`.
- Delete `lib/dining-utils.ts`. If the two `determineHallStatus` copies differ, keep the `lib/dining/status.ts` version and note any behaviour difference in the PR.

## 10. Replace `alert()`
`components/locations/slug/LocationHero.tsx:67` calls `alert()` as a share fallback. Copy the text to the clipboard and show a toast (`lib/toast.ts`) instead.

## 11. Raw `<button>`s in toolbars and cards
About 40 raw `<button>` elements exist. Where one is a standard action, switch it to `Button` with the right variant and the `lib/button-styles.ts` helpers. Examples: `QuickToggles` scroll arrows, the "Clear Filters" link-button on the hall page, `MenuTabs` (could use Radix `Tabs`; keep the visual exactly).

## 12. Locations search fields → `SearchField`
`components/locations/LocationsView.tsx` has two inline search inputs (desktop sidebar and mobile drawer) that duplicate `components/ui/search-field.tsx`.
- Replace both. `SearchField` forwards `ref`, so `mobileSearchRef` keeps working; pass `onBlur` and the other props through.
- This file is shared with the feature agent: limit the change to the two inputs.

## 13. Revalidate the day-menu cache after a scrape
`/menus/offerings` is cached for 10 minutes per date with the tag `day-menu`.
- Add `POST /api/revalidate` (Bearer `CRON_SECRET`, constant-time compare like `app/api/cron/daily-digest/route.ts`) that calls `revalidateTag("day-menu")`.
- Have the scraper call it at the end of a successful run, with an optional `WEB_REVALIDATE_URL` env var.

## 14. Unit tests for the new pure logic
Once round 1's Vitest setup lands, add tests for:
- `lib/day-menu/scoring.ts`: `shiftRange` (overnight), `currentOrNextShift`, `mealForShift`, `itemFit`
- `lib/day-menu/match.ts`: dealbreakers → score 0; boosted item → "Your usual"; more eligible items → higher variety
- `lib/day-menu/dishes.ts`: `relevance` (prefix > word > substring > station; all terms must match); grouping by `key`; "ended" offerings sort last

Build fixtures as small hand-written `DayMenu` objects.
