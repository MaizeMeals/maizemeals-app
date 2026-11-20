-- Make review/photo author ids private. Applied after the app switched to
-- reviews_public() (previous migration), so public pages never break.
-- Only the author (and the service role used by /admin) can read
-- user_ratings.user_id or photos.user_id.

-- Reviews: authors read their own rows (to edit them); everyone else uses
-- reviews_public(). The rating aggregates trigger is SECURITY DEFINER, so
-- averages still see every review.
drop policy if exists "Ratings are public" on public.user_ratings;
drop policy if exists "Users can view own ratings" on public.user_ratings;
create policy "Users can view own ratings" on public.user_ratings
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Photos stay publicly readable once approved, but not who uploaded them.
revoke select on public.photos from anon, authenticated;
grant select (id, item_id, storage_path, is_approved, created_at, user_rating_id)
  on public.photos to anon, authenticated;

-- reviewer_profiles exposed user_id -> name for anyone who had reviewed.
drop view if exists public.reviewer_profiles;

