-- PENDING — apply only AFTER the scraper on the home server is updated to the
-- version whose upsert_operating_hours() does delete + insert (no
-- on_conflict="dining_hall_id, date, event_name"). The old scraper's upsert
-- needs the constraint dropped here and would fail to save any hours.
--
-- Allows split shifts (two "Lunch" rows on one day with different times).
-- To apply: move this file into supabase/migrations/ with a fresh timestamp
-- (e.g. supabase migration new split_shift_hours) and push, or ask Claude to
-- apply it via the Supabase connector.

alter table public.operating_hours
  drop constraint if exists operating_hours_dining_hall_id_date_event_name_key;

alter table public.operating_hours
  add constraint operating_hours_hall_date_event_start_key
  unique (dining_hall_id, date, event_name, start_time);

notify pgrst, 'reload schema';
