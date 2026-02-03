-- 1. Reset (Optional - careful, deletes everything!)
-- drop table if exists photos, user_ratings, menu_events, items, dining_halls cascade;

-- 2. Extensions
create extension if not exists "uuid-ossp";

-- 3. Dining Halls (Using Slugs for Scraper)
create table dining_halls (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique -- "bursley", "mosher-jordan"
);

-- 4. Items (Location-Specific Food)
create table items (
  id uuid primary key default uuid_generate_v4(),
  dining_hall_id uuid references dining_halls(id) not null,
  name text not null,
  normalized_name text, 
  nutrition_score int, 
  macronutrients jsonb, 
  dietary_tags text[], 
  avg_rating float default 0,
  created_at timestamp with time zone default now(),
  
  -- Ensures "Chicken Tenders" is unique PER hall, but allowed across different halls
  unique(dining_hall_id, name)
);

-- 5. Menu Events (Schedule - Now with BRUNCH)
create table menu_events (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references items(id) not null,
  dining_hall_id uuid references dining_halls(id) not null,
  meal text not null check (meal in ('Breakfast', 'Brunch', 'Lunch', 'Dinner')), 
  date date not null default current_date,
  
  -- Prevent accidental double-scheduling of the same item for same meal
  unique(item_id, date, meal)
);

-- 6. User Ratings
create table user_ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  item_id uuid references items(id) not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- 7. Photos
create table photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  item_id uuid references items(id) not null,
  storage_path text not null,
  is_approved boolean default false,
  created_at timestamp with time zone default now()
);

-- 8. Seed Data (Corrected Slugs)
insert into dining_halls (name, slug) values 
  ('Bursley', 'bursley'),
  ('South Quad', 'south-quad'),
  ('Mosher-Jordan', 'mosher-jordan'),
  ('East Quad', 'east-quad'),
  ('North Quad', 'north-quad'),
  ('Markley', 'markley'),
  ('Twigs', 'twigs-at-oxford');