# MVP easy fixes (handoff)

Small, well-scoped fixes from the November 2026 MVP audit. Each one is independent.

**Ground rules**
- Branch from the latest `claude/maizemeals-mvp-audit-2xr328`; it contains the Supabase hardening that is already live in production.
- **Do not change the database or Supabase settings.** Anything that needs a migration goes back to the owner.
- **Don't touch these files.** Another agent is building the PWA, bottom nav and Hall Match Score in them:
  `web/app/layout.tsx`, `web/next.config.ts`, `web/components/layout/Header*.tsx`, `web/components/layout/constants.ts`,
  `web/components/locations/LocationsView.tsx`, `web/components/locations/LocationListCard.tsx`,
  `web/hooks/use-locations-list.ts`, `web/app/recommendations/route.ts`, `web/lib/preference-scoring.ts`, `web/components/layout/UserNav.tsx`, `web/app/globals.css`, `web/components/pwa/*`, `web/components/menus/*`, `web/lib/day-menu/*`, `web/app/menus/*`, `web/components/ui/segmented-control.tsx`, `web/types/location-summary.ts`, `web/public/{sw.js,offline.html,icons/}`, `web/app/manifest.ts`.
- Before each commit, `cd web && npx tsc --noEmit && npx next build` must pass. Building with placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars is fine.

---

## Bugs

1. **A quick-filter tap becomes a permanent dealbreaker.**
   `web/app/locations/[slug]/page.tsx`, function `setFiltersWithProfileSync`. Every dietary chip change is written to `user_profiles.dietary_filters`, which is the "Require" hard filter used on every hall and by `/recommendations`. Tapping "Spicy" or "High Protein" once hides everything else app-wide.
   - Persist only the Tier-1 essentials: `vegetarian`, `vegan`, `halal`, `glutenfree` (the options in `components/preferences/DietaryEssentialsSheet.tsx`). Other chips stay page-local.
   - Move the `updatePreferences(...)` call out of the `setFilters` updater. Side effects inside a state updater run twice in StrictMode and update another component during render.
   - Check the merge `useEffect` below it still works: profile essentials are pre-selected and page-only chips aren't saved.

2. **Halal and Kosher filters accept any vegetarian dish.**
   `web/lib/filter-utils.ts`, `DIETARY_FILTER_SATISFIED_BY`. Make `halal` and `kosher` require the real tag; production has 1,465 halal and 139 kosher items. Keep `vegetarian` → `["vegetarian","vegan"]`.

3. **Photo upload fails for many phone photos.**
   `web/components/locations/detail-panel/ReviewModal.tsx` (~line 136) and `web/components/reviews/EditReviewDialog.tsx`:
   - Compress to `maxSizeMB: 0.15` and `maxWidthOrHeight: 1600` (the design doc targets 100–150 KB).
   - If compression throws, **don't** fall back to the original file. Show "Couldn't process this photo. Try a JPEG or PNG." HEIC fails to decode outside Safari.
   - Use `accept="image/jpeg,image/png,image/webp"` on the file input.
   - In `web/app/actions/submit-review.ts` and `update-review.ts`, reject files whose `type` isn't `image/jpeg|png|webp|gif`.
   - (Done: the server-action body limit in `next.config.ts` is now 3 MB.)

4. **Duplicate review gives a dead-end error.**
   The database now enforces one review per user per item (error 23505). In `submit-review.ts`, return a distinct result, e.g. `{ success:false, code:"already_reviewed" }`. In `ReviewModal` and `ReviewsTab`, offer "Edit your review" (the edit flow is `components/reviews/EditReviewDialog.tsx`) instead of just showing a toast.

5. **Halls show "Closed" during overnight shifts.**
   `web/lib/dining/status.ts`. When `end_time <= start_time` (e.g. 22:00–02:00, or 00:00–00:00 for 24/7 kiosks), the end is the next day. Handle that wherever `eDate` is built. Also account for a shift from *yesterday* that is still running after midnight (pass yesterday's shifts in, or document it as a limitation). Add a small unit-testable pure function and test it (see item 13).

6. **Auth redirect goes to production from preview deploys.**
   `web/lib/get-url.ts`. Prefer `NEXT_PUBLIC_SITE_URL`. Use `VERCEL_PROJECT_PRODUCTION_URL` only when `VERCEL_ENV === "production"`, otherwise `VERCEL_URL`, otherwise localhost. Add each preview URL pattern to the Supabase Auth redirect allow-list; document this in the README, since the owner does it in the dashboard.

7. **Sign-out redirect status.** `web/app/auth/signout/route.ts`: use `303` (POST→GET), not `302`.

8. **Next 16 deprecations.**
   - Rename `web/middleware.ts` → `web/proxy.ts` (same matcher; the export becomes `proxy`).
   - In `web/lib/supabase/middleware.ts` and `web/lib/supabase/server.ts`, switch `@supabase/ssr` cookie handling to the current `getAll` / `setAll` API.
   - Check that login, sign-out and session refresh still work.

## Missing pages and dead links

9. **Footer links that 404:** `/about`, `/faq`, `/contact` (`web/components/layout/Footer.tsx`). Add simple static pages styled like `app/privacy/page.tsx`. Include:
   - About: the student project, the not-affiliated-with-U-M disclaimer from the README, and where menu data comes from.
   - FAQ: how ratings work, why photos need approval, how dietary filters work, plus an allergen disclaimer ("Always confirm allergens with dining staff").
   - Contact: a `mailto:` link; ask the owner for the address.

10. **`/settings` page** (linked from `web/components/layout/UserNav.tsx:125`; currently 404s). It's a signed-in page (redirect to `/login?next=/settings` otherwise) and reuses existing pieces:
    - Dietary dealbreakers: reuse `DietaryEssentialsSheet` or the same toggles inline, saved via `usePreferences().updatePreferences`.
    - Recommendation sliders: reuse the `SmartSlidersDialog` controls.
    - MaizeMacros: link to `/nutrition` to edit targets.
    - Sign out button.
    - **Leave a placeholder section for "Delete account".** The owner is building that, because it needs the service role.

11. ~~Landing CTAs~~ — no change needed: `/menus` is now the item-based "Find food" view, so the Hero's "Find food" and the CTA's "View today's menu" links are correct as they are.

## Repo hygiene and docs

12. **`.env.example` files and an accurate README.** No `.env.example` exists even though the README references one. The scraper uses the M-Dining JSON API (`MDINING_API_KEY`, `MDINING_BASE_URL`), not BeautifulSoup HTML scraping or Gemini; fix README.md and GEMINI.md. Variables used by the code:
    - Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_KEY` (service role, server only), `ADMIN_USER_IDS`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_SITE_URL`, `MDINING_API_KEY`, `MDINING_BASE_URL`.
    - Scraper: `SUPABASE_URL`, `SUPABASE_KEY`, `MDINING_API_KEY`, `MDINING_BASE_URL`.

13. **CI and lint.**
    - Add `.github/workflows/ci.yml`: on PRs, run `npm ci`, `npx tsc --noEmit` and `npx next build` in `web/` with placeholder env vars, and `python -m py_compile` on the scraper.
    - Add ESLint (`eslint-config-next`) with a `lint` script; fix or disable noisy rules rather than mass-editing.
    - Add Vitest with a few tests for `lib/filter-utils.ts`, `lib/preference-scoring.ts`, `lib/dining/status.ts` and `lib/auth-next-path.ts`.

14. **Delete leftovers:** `supabase/snippets/Untitled query 547.sql`, the empty `supabase/schema.sql` (or have the `db:pull-prod` script write it), `.config/zed/`, and the unused `public/{file,globe,next,window}.svg`. Also check whether `hooks/usePreferences.ts` (a one-line re-export) can be removed by updating its imports.

15. **Heavy static assets.**
    - `web/public/images/dining_halls_hq/*.jpg` is about 10 MB total; re-encode to WebP/AVIF at ≤1600px wide, around 150–300 KB each.
    - `web/public/videos/campus-drone.mp4` is 3.9 MB; re-encode around 1–1.5 MB and add a `poster` image.
    - Make sure the images render through `next/image` with `sizes` set.

## Scraper (`scraper/`)

16. **Don't wipe a menu before the new one is fetched.**
    `main.py` calls `delete_events_for_date` *before* fetching. If the API fails partway, that hall shows an empty menu all day. Fetch every meal for the location first. Only if at least one meal returned items, delete and re-insert. Otherwise keep the existing rows and log a warning.

17. **Alert on failure.**
    - Count items saved per run. If the count is 0, or any location errored, POST a summary to `DISCORD_WEBHOOK_URL` (optional env var) and `sys.exit(1)` so cron/systemd records the failure.
    - Add retries with backoff (3 attempts) on M-Dining API calls.
    - Fix the date-format docstrings: the code uses `DD-MM-YYYY`.
