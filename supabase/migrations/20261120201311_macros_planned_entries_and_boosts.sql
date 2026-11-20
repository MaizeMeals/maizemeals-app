alter table public.food_logs
  add column if not exists is_planned boolean not null default false;

comment on column public.food_logs.is_planned is
  'Planned for later (e.g. tomorrow''s menu). Excluded from day totals and from recommendation boosts until marked eaten.';

create index if not exists food_logs_user_day_idx on public.food_logs (user_id, consumed_on);

-- Boost dishes the user keeps eating: same dish name at any hall, 3+ times
-- in the last 14 days (eaten, not planned). Boosts every item with that name,
-- so the same dish at another hall ranks up too.
create or replace function public.refresh_macro_implicit_traits(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare boosts jsonb;
begin
  with frequent as (
    select coalesce(i.normalized_name, lower(fl.item_name)) as dish, count(*) as times
    from public.food_logs fl
    left join public.items i on i.id = fl.item_id
    where fl.user_id = target_user_id
      and fl.item_id is not null
      and not fl.is_planned
      and fl.consumed_on >= (now() at time zone 'America/New_York')::date - 14
    group by 1
    having count(*) >= 3
  )
  select coalesce(jsonb_object_agg(i.id::text, case when f.times >= 5 then 50 else 30 end), '{}'::jsonb)
  into boosts
  from frequent f
  join public.items i on i.normalized_name = f.dish;

  update public.user_profiles
  set implicit_traits = jsonb_set(coalesce(implicit_traits, '{}'::jsonb), '{boosted_item_ids}', boosts, true)
  where user_id = target_user_id;
end;
$$;

-- Daily (cron) so boosts fade when someone stops eating a dish.
create or replace function public.refresh_all_macro_implicit_traits()
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid; n integer := 0;
begin
  for uid in
    select user_id from public.user_profiles
    where implicit_traits->'boosted_item_ids' is not null
      and implicit_traits->'boosted_item_ids' <> '{}'::jsonb
    union
    select distinct user_id from public.food_logs
    where consumed_on >= (now() at time zone 'America/New_York')::date - 15
  loop
    perform public.refresh_macro_implicit_traits(uid);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.refresh_macro_implicit_traits(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_all_macro_implicit_traits() from public, anon, authenticated;
grant execute on function public.refresh_all_macro_implicit_traits() to service_role;
