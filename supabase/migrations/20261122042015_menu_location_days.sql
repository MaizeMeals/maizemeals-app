-- Which locations have a menu on each date. Powers the landing page's
-- break/closure notice (compare a day's count with the usual for that weekday).
create or replace function public.menu_location_days(p_from date, p_to date)
returns table (date date, halls jsonb)
language sql
stable
security invoker
set search_path = public
as $$
  select d.date,
         jsonb_agg(jsonb_build_object('name', coalesce(nullif(trim(h.display_name), ''), h.name), 'slug', h.slug, 'type', h.type)
                   order by coalesce(nullif(trim(h.display_name), ''), h.name)) as halls
  from (
    select distinct e.date, i.dining_hall_id
    from menu_events e
    join items i on i.id = e.item_id
    where e.date between p_from and p_to
  ) d
  join dining_halls h on h.id = d.dining_hall_id
  group by d.date
  order by d.date;
$$;

revoke all on function public.menu_location_days(date, date) from public;
grant execute on function public.menu_location_days(date, date) to anon, authenticated;
