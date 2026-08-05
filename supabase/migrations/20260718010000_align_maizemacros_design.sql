-- Compatibility bridge for environments where the first macro-tracker draft
-- was already applied under nutrition_goals / food_log_entries.
do $$
begin
  if to_regclass('public.nutrition_goals') is not null
     and to_regclass('public.user_macro_goals') is null then
    alter table public.nutrition_goals rename to user_macro_goals;
  end if;
  if to_regclass('public.food_log_entries') is not null
     and to_regclass('public.food_logs') is null then
    alter table public.food_log_entries rename to food_logs;
  end if;
end $$;

-- If the replacement schema was created before this bridge ran, preserve rows
-- from the draft tables rather than leaving them stranded. The draft tables
-- remain untouched so this migration is non-destructive.
do $$
begin
  if to_regclass('public.nutrition_goals') is not null
     and to_regclass('public.user_macro_goals') is not null then
    insert into public.user_macro_goals (
      user_id,
      target_calories,
      target_protein_g,
      target_carbs_g,
      target_fat_g,
      goal_type,
      setup_completed,
      created_at,
      updated_at
    )
    select
      user_id,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      'MAINTAIN',
      false,
      created_at,
      updated_at
    from public.nutrition_goals
    on conflict (user_id) do nothing;
  end if;

  if to_regclass('public.food_log_entries') is not null
     and to_regclass('public.food_logs') is not null then
    insert into public.food_logs (
      id,
      user_id,
      item_id,
      item_name,
      serving_size,
      servings,
      meal_type,
      consumed_on,
      logged_at,
      calories_per_serving,
      protein_g_per_serving,
      carbs_g_per_serving,
      fat_g_per_serving,
      nutrition_snapshot,
      created_at,
      updated_at
    )
    select
      id,
      user_id,
      item_id,
      item_name,
      serving_size,
      servings,
      upper(meal),
      consumed_on,
      consumed_at,
      calories_per_serving,
      protein_g_per_serving,
      carbs_g_per_serving,
      fat_g_per_serving,
      nutrition_snapshot,
      created_at,
      updated_at
    from public.food_log_entries
    on conflict (id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_macro_goals' and column_name='calories') then
    alter table public.user_macro_goals rename column calories to target_calories;
    alter table public.user_macro_goals rename column protein_g to target_protein_g;
    alter table public.user_macro_goals rename column carbs_g to target_carbs_g;
    alter table public.user_macro_goals rename column fat_g to target_fat_g;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='food_logs' and column_name='meal') then
    alter table public.food_logs drop constraint if exists food_log_entries_meal_check;
    alter table public.food_logs rename column meal to meal_type;
    update public.food_logs set meal_type = upper(meal_type);
    alter table public.food_logs add constraint food_logs_meal_type_check
      check (meal_type in ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER'));
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='food_logs' and column_name='consumed_at') then
    alter table public.food_logs rename column consumed_at to logged_at;
  end if;
end $$;

alter table public.user_profiles
  add column if not exists implicit_traits jsonb not null default
    '{"boosted_item_ids": {}, "avoid_tags": []}'::jsonb;

alter table public.user_macro_goals
  add column if not exists goal_type text,
  add column if not exists setup_completed boolean not null default false;

-- Old manually-entered goals are retained as an incomplete Maintain setup;
-- the target editor will replace these values on first save.
update public.user_macro_goals set
  goal_type = coalesce(goal_type, 'MAINTAIN');

alter table public.user_macro_goals
  alter column goal_type set not null;

alter table public.user_macro_goals drop constraint if exists user_macro_goals_goal_type_check;
alter table public.user_macro_goals add constraint user_macro_goals_goal_type_check check (goal_type in ('CUT', 'MAINTAIN', 'BULK'));

create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, consumed_on desc, logged_at desc);
create index if not exists food_logs_recent_items_idx
  on public.food_logs (user_id, item_id, logged_at desc)
  where item_id is not null;

-- Recreate policies under stable names after a possible table rename.
alter table public.user_macro_goals enable row level security;
alter table public.food_logs enable row level security;
drop policy if exists "Users can read their own macro goals" on public.user_macro_goals;
create policy "Users can read their own macro goals" on public.user_macro_goals for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own macro goals" on public.user_macro_goals;
create policy "Users can create their own macro goals" on public.user_macro_goals for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own macro goals" on public.user_macro_goals;
create policy "Users can update their own macro goals" on public.user_macro_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own macro goals" on public.user_macro_goals;
create policy "Users can delete their own macro goals" on public.user_macro_goals for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_macro_goals to authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;

create or replace function public.refresh_macro_implicit_traits(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare boosts jsonb;
begin
  select coalesce(jsonb_object_agg(item_id::text, 50), '{}'::jsonb) into boosts
  from (
    select item_id from public.food_logs
    where user_id = target_user_id and item_id is not null
      and logged_at >= now() - interval '7 days'
    group by item_id having count(*) > 3
  ) frequent_items;
  update public.user_profiles
  set implicit_traits = jsonb_set(coalesce(implicit_traits, '{}'::jsonb), '{boosted_item_ids}', boosts, true)
  where user_id = target_user_id;
end;
$$;

create or replace function public.analyze_food_log_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_macro_implicit_traits(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;
drop trigger if exists analyze_food_logs_for_preferences on public.food_logs;
create trigger analyze_food_logs_for_preferences after insert or update or delete on public.food_logs
for each row execute function public.analyze_food_log_change();

create or replace function public.apply_bulk_protein_priority()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.goal_type = 'BULK' then
    update public.user_profiles set protein_priority = 100 where user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.refresh_macro_implicit_traits(uuid) from public, anon, authenticated;
revoke execute on function public.analyze_food_log_change() from public, anon, authenticated;
revoke execute on function public.apply_bulk_protein_priority() from public, anon, authenticated;
drop trigger if exists macro_goal_updates_preferences on public.user_macro_goals;
create trigger macro_goal_updates_preferences after insert or update of goal_type on public.user_macro_goals
for each row execute function public.apply_bulk_protein_priority();

notify pgrst, 'reload schema';
