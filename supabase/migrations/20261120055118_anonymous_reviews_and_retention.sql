-- Anonymous reviews, private author identities, and keeping reviews/photos
-- when an account is deleted.
--
-- * user_ratings.is_anonymous: the author chose not to show their name.
-- * Reviews and photos survive account deletion with user_id set to NULL;
--   the app shows them as "Deleted user" (or "Anonymous" if they were).
-- * reviews_public(): what public pages read, with author names already
--   masked for anonymous and deleted authors. The next migration then makes
--   author ids private (applied once the app reads reviews_public()).

-- 1. Anonymous flag ----------------------------------------------------------
alter table public.user_ratings
  add column if not exists is_anonymous boolean not null default false;

comment on column public.user_ratings.is_anonymous is
  'Author hid their name. Public reads (reviews_public) show "Anonymous"; admins still see the author.';

-- 2. Keep reviews and photos when the author deletes their account ----------
alter table public.user_ratings alter column user_id drop not null;
alter table public.user_ratings drop constraint if exists user_ratings_user_id_fkey;
alter table public.user_ratings
  add constraint user_ratings_user_id_fkey
  foreign key (user_id) references public.user_profiles (user_id) on delete set null;

alter table public.photos alter column user_id drop not null;
alter table public.photos drop constraint if exists photos_user_id_fkey;
alter table public.photos
  add constraint photos_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- 3. Public review feed -----------------------------------------------------
create or replace function public.reviews_public(
  p_item_id uuid default null,
  p_hall_id uuid default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  item_id uuid,
  item_name text,
  dining_hall_id uuid,
  rating integer,
  comment text,
  created_at timestamptz,
  edited_at timestamptz,
  is_anonymous boolean,
  is_mine boolean,
  author_name text,
  author_avatar_url text,
  photos jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.item_id,
    i.name as item_name,
    i.dining_hall_id,
    r.rating,
    r.comment,
    r.created_at,
    r.edited_at,
    r.is_anonymous,
    coalesce(r.user_id = (select auth.uid()), false) as is_mine,
    case
      when r.is_anonymous then 'Anonymous'
      when r.user_id is null then 'Deleted user'
      else coalesce(nullif(trim(p.display_name), ''), 'Student')
    end as author_name,
    case when r.is_anonymous or r.user_id is null then null else p.avatar_url end as author_avatar_url,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('storage_path', ph.storage_path, 'is_approved', ph.is_approved)
                         order by ph.created_at)
        from public.photos ph
        where ph.user_rating_id = r.id
          and (ph.is_approved is true or (r.user_id is not null and r.user_id = (select auth.uid())))
      ),
      '[]'::jsonb
    ) as photos
  from public.user_ratings r
  join public.items i on i.id = r.item_id
  left join public.user_profiles p on p.user_id = r.user_id
  where (p_item_id is not null or p_hall_id is not null)
    and (p_item_id is null or r.item_id = p_item_id)
    and (p_hall_id is null or i.dining_hall_id = p_hall_id)
  order by r.created_at desc nulls last
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

comment on function public.reviews_public(uuid, uuid, integer) is
  'Public reviews for an item or a hall. Author names are masked for anonymous and deleted authors; user ids are never returned.';

revoke all on function public.reviews_public(uuid, uuid, integer) from public;
grant execute on function public.reviews_public(uuid, uuid, integer) to anon, authenticated;
