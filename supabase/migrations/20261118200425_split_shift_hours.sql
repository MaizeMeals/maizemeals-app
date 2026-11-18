-- Allows split shifts (two "Lunch" rows on one day with different times).
-- Requires the scraper version whose upsert_operating_hours() does
-- delete + insert (no on_conflict on dining_hall_id, date, event_name).
-- Applied to production 2026-11-18 after the home-server scraper was updated.
alter table public.operating_hours
  drop constraint if exists operating_hours_dining_hall_id_date_event_name_key;

alter table public.operating_hours
  add constraint operating_hours_hall_date_event_start_key
  unique (dining_hall_id, date, event_name, start_time);

notify pgrst, 'reload schema';
