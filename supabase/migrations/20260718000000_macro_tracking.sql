-- MaizeMacros storage follows the approved design's Billboard pattern:
-- food_logs is raw user input; implicit_traits is derived profile state; menu
-- recommendations read the profile, never the raw log table.

alter table public.user_profiles
  add column if not exists implicit_traits jsonb not null default
    '{"boosted_item_ids": {}, "avoid_tags": []}'::jsonb;

create table if not exists public.user_macro_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_calories integer not null check (target_calories > 0 and target_calories <= 10000),
  target_protein_g numeric(7, 2) not null check (target_protein_g >= 0 and target_protein_g <= 1000),
  target_carbs_g numeric(7, 2) not null check (target_carbs_g >= 0 and target_carbs_g <= 2000),
  target_fat_g numeric(7, 2) not null check (target_fat_g >= 0 and target_fat_g <= 1000),
  goal_type text not null check (goal_type in ('CUT', 'MAINTAIN', 'BULK')),
  setup_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  serving_size text,
  servings numeric(6, 2) not null default 1 check (servings > 0 and servings <= 100),
  meal_type text not null default 'OTHER' check (
    meal_type in ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER')
  ),
  consumed_on date not null default current_date,
  logged_at timestamptz not null default now(),
  calories_per_serving numeric(9, 2) not null default 0 check (calories_per_serving >= 0),
  protein_g_per_serving numeric(9, 2) not null default 0 check (protein_g_per_serving >= 0),
  carbs_g_per_serving numeric(9, 2) not null default 0 check (carbs_g_per_serving >= 0),
  fat_g_per_serving numeric(9, 2) not null default 0 check (fat_g_per_serving >= 0),
  nutrition_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, consumed_on desc, logged_at desc);
create index if not exists food_logs_recent_items_idx
  on public.food_logs (user_id, item_id, logged_at desc)
  where item_id is not null;

alter table public.user_macro_goals enable row level security;
alter table public.food_logs enable row level security;

drop policy if exists "Users can read their own macro goals" on public.user_macro_goals;
create policy "Users can read their own macro goals"
  on public.user_macro_goals for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own macro goals" on public.user_macro_goals;
create policy "Users can create their own macro goals"
  on public.user_macro_goals for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own macro goals" on public.user_macro_goals;
create policy "Users can update their own macro goals"
  on public.user_macro_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own macro goals" on public.user_macro_goals;
create policy "Users can delete their own macro goals"
  on public.user_macro_goals for delete using (auth.uid() = user_id);

drop policy if exists "Users can read their own food log" on public.food_logs;
create policy "Users can read their own food log"
  on public.food_logs for select using (auth.uid() = user_id);
drop policy if exists "Users can add to their own food log" on public.food_logs;
create policy "Users can add to their own food log"
  on public.food_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own food log" on public.food_logs;
create policy "Users can update their own food log"
  on public.food_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete from their own food log" on public.food_logs;
create policy "Users can delete from their own food log"
  on public.food_logs for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_macro_goals to authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;

-- More than three logs of an item in seven days creates a +50 recommendation
-- boost. Rebuild the derived map after any log mutation so it can also decay.
create or replace function public.refresh_macro_implicit_traits(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  boosts jsonb;
begin
  select coalesce(jsonb_object_agg(item_id::text, 50), '{}'::jsonb)
  into boosts
  from (
    select item_id
    from public.food_logs
    where user_id = target_user_id
      and item_id is not null
      and logged_at >= now() - interval '7 days'
    group by item_id
    having count(*) > 3
  ) frequent_items;

  update public.user_profiles
  set implicit_traits = jsonb_set(
    coalesce(implicit_traits, '{}'::jsonb),
    '{boosted_item_ids}',
    boosts,
    true
  )
  where user_id = target_user_id;
end;
$$;

create or replace function public.analyze_food_log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_macro_implicit_traits(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists analyze_food_logs_for_preferences on public.food_logs;
create trigger analyze_food_logs_for_preferences
after insert or update or delete on public.food_logs
for each row execute function public.analyze_food_log_change();

-- The approved product rule makes Bulk automatically protein-forward.
create or replace function public.apply_bulk_protein_priority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.goal_type = 'BULK' then
    update public.user_profiles
    set protein_priority = 100
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.refresh_macro_implicit_traits(uuid)
  from public, anon, authenticated;
revoke execute on function public.analyze_food_log_change()
  from public, anon, authenticated;
revoke execute on function public.apply_bulk_protein_priority()
  from public, anon, authenticated;

drop trigger if exists macro_goal_updates_preferences on public.user_macro_goals;
create trigger macro_goal_updates_preferences
after insert or update of goal_type on public.user_macro_goals
for each row execute function public.apply_bulk_protein_priority();

notify pgrst, 'reload schema';
