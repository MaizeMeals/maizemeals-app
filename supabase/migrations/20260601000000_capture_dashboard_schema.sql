-- Baseline for schema that was created in the Supabase dashboard between
-- initial_setup (Feb) and macro_tracking (Jul) and never committed.
--
-- Reconstructed from the production catalog on 2026-11-18. Production already
-- has all of this; the migration is recorded there as applied without being
-- run (see the hardening migration that follows). It exists so that
-- `supabase db reset` can rebuild a database that matches production and so
-- later migrations (which alter user_profiles) apply cleanly.
--
-- Everything is idempotent. Not reproduced: the `ensure_rls` event trigger
-- (public.rls_auto_enable), which comes from a dashboard setting and needs
-- superuser to create.

create extension if not exists moddatetime with schema extensions;

-- ---------------------------------------------------------------------------
-- dining_halls: scraper metadata + rating aggregates
-- ---------------------------------------------------------------------------
alter table public.dining_halls
  add column if not exists official_id integer,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists image_url text,
  add column if not exists max_capacity integer default 0,
  add column if not exists display_name text,
  add column if not exists type text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists avg_rating numeric(3,2) default 0.00,
  add column if not exists review_count integer default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dining_halls_official_id_type_key') then
    alter table public.dining_halls
      add constraint dining_halls_official_id_type_key unique (official_id, type);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- items: station, classification, rating aggregates
-- ---------------------------------------------------------------------------
alter table public.items
  add column if not exists updated_at timestamptz default now(),
  add column if not exists station text,
  add column if not exists is_mhealthy boolean default false,
  add column if not exists serving_size text,
  add column if not exists item_type text default 'food',
  add column if not exists review_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proper_nutrition_json') then
    alter table public.items
      add constraint proper_nutrition_json check (jsonb_typeof(macronutrients) = 'object');
  end if;
end $$;

drop trigger if exists handle_updated_at on public.items;
create trigger handle_updated_at before update on public.items
  for each row execute function extensions.moddatetime('updated_at');

-- ---------------------------------------------------------------------------
-- menu_events: meal times + extra meal names used by the scraper
-- ---------------------------------------------------------------------------
alter table public.menu_events
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.menu_events drop constraint if exists menu_events_meal_check;
alter table public.menu_events add constraint menu_events_meal_check
  check (meal in ('Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night', 'All Day'));

-- ---------------------------------------------------------------------------
-- operating_hours / capacity_logs
-- ---------------------------------------------------------------------------
create table if not exists public.operating_hours (
  id uuid primary key default extensions.uuid_generate_v4(),
  dining_hall_id uuid not null references public.dining_halls(id),
  date date not null,
  event_name text,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  unique (dining_hall_id, date, event_name)
);

create table if not exists public.capacity_logs (
  id uuid primary key default extensions.uuid_generate_v4(),
  dining_hall_id uuid not null references public.dining_halls(id),
  patron_count integer,
  capacity_percentage integer,
  recorded_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- user_profiles (the "Billboard")
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  dietary_filters jsonb not null default '[]'::jsonb,
  health_focus integer not null default 50 check (health_focus between 0 and 100),
  protein_priority integer not null default 50 check (protein_priority between 0 and 100),
  rating_sensitivity integer not null default 50 check (rating_sensitivity between 0 and 100),
  default_campus text check (default_campus in ('NORTH', 'CENTRAL', 'HILL', 'OFF_CAMPUS')),
  favorite_location_ids uuid[] default '{}'::uuid[],
  streak_current integer not null default 0,
  streak_max integer not null default 0,
  last_played_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  uniqname text,
  avatar_url text,
  display_name text
);

drop trigger if exists handle_updated_at on public.user_profiles;
create trigger handle_updated_at before update on public.user_profiles
  for each row execute function extensions.moddatetime('updated_at');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- user_ratings / photos
-- ---------------------------------------------------------------------------
alter table public.user_ratings add column if not exists edited_at timestamptz;

alter table public.user_ratings drop constraint if exists user_ratings_user_id_fkey;
alter table public.user_ratings add constraint user_ratings_user_id_fkey
  foreign key (user_id) references public.user_profiles(user_id);

alter table public.photos add column if not exists user_rating_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_user_rating_id_fkey') then
    alter table public.photos add constraint photos_user_rating_id_fkey
      foreign key (user_rating_id) references public.user_ratings(id) on delete set null;
  end if;
end $$;

-- Rating aggregates (items + dining_halls)
create or replace function public.refresh_item_and_hall_stats(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hall_id uuid;
  v_item_avg double precision;
  v_item_count bigint;
  v_hall_avg double precision;
  v_hall_count bigint;
begin
  select dining_hall_id into v_hall_id from public.items where id = p_item_id;
  if not found then
    return;
  end if;

  select coalesce(avg(rating), 0), count(*)
  into v_item_avg, v_item_count
  from public.user_ratings
  where item_id = p_item_id;

  update public.items
  set avg_rating = v_item_avg,
      review_count = v_item_count::integer
  where id = p_item_id;

  if v_hall_id is null then
    return;
  end if;

  select coalesce(avg(ur.rating), 0), count(*)
  into v_hall_avg, v_hall_count
  from public.user_ratings ur
  join public.items i on i.id = ur.item_id
  where i.dining_hall_id = v_hall_id;

  update public.dining_halls
  set avg_rating = v_hall_avg,
      review_count = v_hall_count
  where id = v_hall_id;
end;
$$;

create or replace function public.trg_user_ratings_refresh_aggregates()
returns trigger
language plpgsql
as $$
declare
  ids uuid[];
  x uuid;
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    ids := array[new.item_id];
    if tg_op = 'UPDATE' and old.item_id is distinct from new.item_id then
      ids := ids || old.item_id;
    end if;
  elsif tg_op = 'DELETE' then
    ids := array[old.item_id];
  end if;

  foreach x in array ids loop
    perform public.refresh_item_and_hall_stats(x);
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists user_ratings_after_change on public.user_ratings;
create trigger user_ratings_after_change after insert or update or delete on public.user_ratings
  for each row execute function public.trg_user_ratings_refresh_aggregates();

-- Production also carried an older duplicate trigger (on_rating_change ->
-- update_item_rating_stats); the hardening migration drops it, so it is not
-- recreated here.

-- ---------------------------------------------------------------------------
-- Row-level security (as configured in production before hardening)
-- ---------------------------------------------------------------------------
alter table public.dining_halls enable row level security;
alter table public.items enable row level security;
alter table public.menu_events enable row level security;
alter table public.operating_hours enable row level security;
alter table public.capacity_logs enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_ratings enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Enable read access for all users" on public.dining_halls;
create policy "Enable read access for all users" on public.dining_halls for select using (true);
drop policy if exists "Enable read access for all users" on public.items;
create policy "Enable read access for all users" on public.items for select using (true);
drop policy if exists "Enable read access for all users" on public.menu_events;
create policy "Enable read access for all users" on public.menu_events for select using (true);
drop policy if exists "Enable read access for all users" on public.operating_hours;
create policy "Enable read access for all users" on public.operating_hours for select using (true);

drop policy if exists "Profiles are viewable by everyone" on public.user_profiles;
create policy "Profiles are viewable by everyone" on public.user_profiles for select using (true);
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Ratings are public" on public.user_ratings;
create policy "Ratings are public" on public.user_ratings for select using (true);
drop policy if exists "Users can add ratings" on public.user_ratings;
create policy "Users can add ratings" on public.user_ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own ratings" on public.user_ratings;
create policy "Users can update own ratings" on public.user_ratings for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can delete own ratings" on public.user_ratings;
create policy "Users can delete own ratings" on public.user_ratings for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Photos are viewable by everyone if approved or owned by user" on public.photos;
create policy "Photos are viewable by everyone if approved or owned by user" on public.photos
  for select using (is_approved = true or auth.uid() = user_id);
drop policy if exists "Users can insert their own photos" on public.photos;
create policy "Users can insert their own photos" on public.photos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own photos" on public.photos;
create policy "Users can delete their own photos" on public.photos for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: review photo bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos', 'item-photos', true, 2097152,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists item_photos_public_read on storage.objects;
create policy item_photos_public_read on storage.objects for select
  using (bucket_id = 'item-photos');
drop policy if exists item_photos_authenticated_insert on storage.objects;
create policy item_photos_authenticated_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos');
drop policy if exists item_photos_authenticated_update on storage.objects;
create policy item_photos_authenticated_update on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and auth.uid() = owner)
  with check (bucket_id = 'item-photos' and auth.uid() = owner);
drop policy if exists item_photos_authenticated_delete on storage.objects;
create policy item_photos_authenticated_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and auth.uid() = owner);

notify pgrst, 'reload schema';
