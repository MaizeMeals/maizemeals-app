alter table public.user_profiles
  add column if not exists avoid_ingredients jsonb not null
  default '{"allergens": [], "additives": [], "hide_unknown": false}'::jsonb;

comment on column public.user_profiles.avoid_ingredients is
  'Menu "Avoid" filters: {allergens: text[] (e.g. "Milk", "Gluten"), additives: text[] (highlight categories, e.g. "seed_oil"), hide_unknown: bool (hide dishes without ingredient data)}';

grant update (avoid_ingredients) on public.user_profiles to authenticated;
