-- Ingredients, allergens and additive highlights from U-M NetNutrition.
-- Written by the scraper (service role); read publicly like the rest of items.
alter table public.items
  add column if not exists ingredients text,
  add column if not exists allergens text[],
  add column if not exists label_notes text[],
  add column if not exists nutrition_label jsonb,
  add column if not exists ingredient_flags jsonb,
  add column if not exists ingredients_checked_at timestamptz;

comment on column public.items.ingredients is
  'Ingredient paragraph from NetNutrition (null = not available).';
comment on column public.items.allergens is
  'Normalized allergens from the label''s Contains line, e.g. {Milk,Wheat}.';
comment on column public.items.label_notes is
  'Non-allergen notes from the Contains line, e.g. {"Item is deep fried"}.';
comment on column public.items.nutrition_label is
  'Full parsed NetNutrition label (serving grams, nutrient rows).';
comment on column public.items.ingredient_flags is
  'Highlighted additive spans in `ingredients`: {categories:[...], spans:[{start,end,category,label}]}.';
comment on column public.items.ingredients_checked_at is
  'Last NetNutrition lookup (hit or miss); the scraper skips recently checked items.';

-- The enrichment step looks up items still missing ingredients by name.
create index if not exists items_normalized_name_idx on public.items (normalized_name);

notify pgrst, 'reload schema';
