-- Saved favorite dishes ("I know what I like").
--
-- Keyed by the normalized dish name (lib/day-menu/types.ts foodKey) rather than
-- items.id, because items are location-specific: favoriting "Chicken Tikka
-- Masala" should surface it at every hall that serves it.
create table if not exists public.favorite_foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  food_key text not null check (char_length(food_key) between 1 and 200),
  display_name text not null check (char_length(display_name) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (user_id, food_key)
);

comment on table public.favorite_foods is
  'Dishes a user saved, by normalized name (shared across locations).';

alter table public.favorite_foods enable row level security;

revoke all on table public.favorite_foods from anon, authenticated;
grant select, insert, delete on table public.favorite_foods to authenticated;

drop policy if exists "Users read own favorite foods" on public.favorite_foods;
create policy "Users read own favorite foods" on public.favorite_foods
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own favorite foods" on public.favorite_foods;
create policy "Users add own favorite foods" on public.favorite_foods
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own favorite foods" on public.favorite_foods;
create policy "Users remove own favorite foods" on public.favorite_foods
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Keep the list sane; the UI never needs more.
create or replace function public.enforce_favorite_foods_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.favorite_foods where user_id = new.user_id) >= 300 then
    raise exception 'Favorite limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_favorite_foods_limit() from public, anon, authenticated;

drop trigger if exists favorite_foods_limit on public.favorite_foods;
create trigger favorite_foods_limit before insert on public.favorite_foods
  for each row execute function public.enforce_favorite_foods_limit();

notify pgrst, 'reload schema';
