-- Security, privacy and performance hardening found in the 2026-11 MVP audit.
--
--  1. user_profiles was readable by anyone (dietary filters, implicit traits,
--     uniqname). Now owner-only; reviewers' public name/avatar come from the
--     reviewer_profiles view.
--  2. Enforce @umich.edu at the database (OAuth `hd` is only a hint).
--  3. Storage: stop anonymous listing of every photo (incl. unapproved) and
--     only allow uploads into an existing item's folder.
--  4. One review per user per item.
--  5. Deleting an account no longer fails for users with reviews/photos.
--  6. Indexes for the menu page query and unindexed foreign keys.
--  7. Drop the duplicate rating-aggregate trigger.
--  8. Supabase advisor fixes: SECURITY DEFINER functions callable over the
--     API, mutable search_path, per-row auth.uid() in policies.
--  9. Remove write/TRUNCATE grants the app never uses.

-- Record the dashboard baseline as applied in environments that already had
-- it (production). No-op where the CLI already ran it (local db reset).
insert into supabase_migrations.schema_migrations (version, name)
values ('20260601000000', 'capture_dashboard_schema')
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Profile privacy
-- ---------------------------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.user_profiles;
drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;

create policy "Users can view own profile" on public.user_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own profile" on public.user_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own profile" on public.user_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.user_profiles from anon, authenticated;
grant select, insert on table public.user_profiles to authenticated;
-- implicit_traits is derived by the food-log analyst trigger and streak_max /
-- created_at are server-owned, so clients may not update them.
grant update (
  onboarding_completed,
  dietary_filters,
  health_focus,
  protein_priority,
  rating_sensitivity,
  default_campus,
  favorite_location_ids,
  streak_current,
  last_played_at,
  uniqname,
  avatar_url,
  display_name,
  updated_at
) on table public.user_profiles to authenticated;

-- Public identity for people who have posted a review. Runs with the view
-- owner's rights on purpose (it is the only public path into user_profiles)
-- and exposes nothing beyond the name and avatar shown next to a review.
create or replace view public.reviewer_profiles
with (security_invoker = false) as
select p.user_id, p.display_name, p.avatar_url
from public.user_profiles p
where exists (select 1 from public.user_ratings r where r.user_id = p.user_id);

comment on view public.reviewer_profiles is
  'Public display name + avatar of users who have posted a review.';

revoke all on public.reviewer_profiles from anon, authenticated;
grant select on public.reviewer_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. @umich.edu only
-- ---------------------------------------------------------------------------
create or replace function public.enforce_umich_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) <> 'umich.edu' then
    raise exception 'MaizeMeals is limited to @umich.edu accounts'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_umich_email on auth.users;
create trigger enforce_umich_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_umich_email();

-- ---------------------------------------------------------------------------
-- 3. Storage
-- ---------------------------------------------------------------------------
-- The bucket stays public so approved photos load via their public URL, but
-- nobody can list the bucket anymore; unapproved files are only reachable by
-- their unguessable path. Owners keep read access (needed to replace/remove).
drop policy if exists item_photos_public_read on storage.objects;
drop policy if exists item_photos_owner_read on storage.objects;
create policy item_photos_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and (select auth.uid()) = owner);

drop policy if exists item_photos_authenticated_insert on storage.objects;
create policy item_photos_authenticated_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] in (select id::text from public.items)
  );

drop policy if exists item_photos_authenticated_update on storage.objects;
create policy item_photos_authenticated_update on storage.objects
  for update to authenticated
  using (bucket_id = 'item-photos' and (select auth.uid()) = owner)
  with check (bucket_id = 'item-photos' and (select auth.uid()) = owner);

drop policy if exists item_photos_authenticated_delete on storage.objects;
create policy item_photos_authenticated_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and (select auth.uid()) = owner);

-- ---------------------------------------------------------------------------
-- 4. One review per user per item
-- ---------------------------------------------------------------------------
-- Keep, per (user, item), the review with a photo if any, else the most
-- recently written one. In production this removes 7 test duplicates, none
-- of which has a photo attached.
with ranked as (
  select
    r.id,
    row_number() over (
      partition by r.user_id, r.item_id
      order by
        exists (select 1 from public.photos p where p.user_rating_id = r.id) desc,
        coalesce(r.edited_at, r.created_at) desc,
        r.id
    ) as rn
  from public.user_ratings r
)
delete from public.user_ratings r
using ranked
where r.id = ranked.id and ranked.rn > 1;

alter table public.user_ratings drop constraint if exists user_ratings_user_item_key;
alter table public.user_ratings
  add constraint user_ratings_user_item_key unique (user_id, item_id);

-- ---------------------------------------------------------------------------
-- 5. Account deletion cascades
-- ---------------------------------------------------------------------------
alter table public.user_ratings drop constraint if exists user_ratings_user_id_fkey;
alter table public.user_ratings add constraint user_ratings_user_id_fkey
  foreign key (user_id) references public.user_profiles(user_id) on delete cascade;

alter table public.photos drop constraint if exists photos_user_id_fkey;
alter table public.photos add constraint photos_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------
-- Menu page + recommendations + scraper delete all filter on hall + date.
create index if not exists menu_events_hall_date_idx
  on public.menu_events (dining_hall_id, date);
create index if not exists user_ratings_item_id_idx on public.user_ratings (item_id);
create index if not exists photos_item_id_idx on public.photos (item_id);
create index if not exists photos_user_id_idx on public.photos (user_id);
create index if not exists photos_user_rating_id_idx on public.photos (user_rating_id);
create index if not exists food_logs_item_id_idx on public.food_logs (item_id);
create index if not exists capacity_logs_hall_recorded_idx
  on public.capacity_logs (dining_hall_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- 7. Single rating-aggregate trigger
-- ---------------------------------------------------------------------------
drop trigger if exists on_rating_change on public.user_ratings;
drop function if exists public.update_item_rating_stats();

-- Runs as owner so refresh_item_and_hall_stats need not be callable by users.
alter function public.trg_user_ratings_refresh_aggregates()
  security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 8. Advisor fixes
-- ---------------------------------------------------------------------------
alter function public.handle_new_user() set search_path = '';

revoke execute on function public.refresh_item_and_hall_stats(uuid) from public, anon, authenticated;
revoke execute on function public.trg_user_ratings_refresh_aggregates() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_umich_email() from public, anon, authenticated;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

drop policy if exists "Users can add ratings" on public.user_ratings;
create policy "Users can add ratings" on public.user_ratings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own ratings" on public.user_ratings;
create policy "Users can update own ratings" on public.user_ratings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own ratings" on public.user_ratings;
create policy "Users can delete own ratings" on public.user_ratings
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Photos are viewable by everyone if approved or owned by user" on public.photos;
create policy "Photos are viewable by everyone if approved or owned by user" on public.photos
  for select using (is_approved = true or (select auth.uid()) = user_id);
drop policy if exists "Users can insert their own photos" on public.photos;
create policy "Users can insert their own photos" on public.photos
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own photos" on public.photos;
create policy "Users can delete their own photos" on public.photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Replacing a review photo (update-review.ts) updates the row's storage_path;
-- with no UPDATE policy that silently matched 0 rows and left the row
-- pointing at a deleted file. Owners may update, but never self-approve.
drop policy if exists "Users can update their own photos" on public.photos;
create policy "Users can update their own photos" on public.photos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and is_approved is not true);

-- Column-level: users may change only what the edit flows change.
revoke update on public.photos from authenticated;
grant update (storage_path, is_approved) on public.photos to authenticated;
revoke update on public.user_ratings from authenticated;
grant update (rating, comment, edited_at) on public.user_ratings to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Grants: menu data is written only by the scraper (service role)
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.dining_halls, public.items, public.menu_events,
     public.operating_hours, public.capacity_logs
  from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.user_ratings, public.photos
  from anon;
revoke truncate, references, trigger
  on public.user_ratings, public.photos
  from authenticated;

notify pgrst, 'reload schema';
