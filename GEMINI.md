# Project Context: U-M Dining App ([placeholder])

## Overview
This is a student-focused dining companion app for the University of Michigan. It allows students to view daily menus, rate food items, upload photos, and track nutrition. It uses a "Split Architecture" with a Next.js frontend hosted on Vercel and a Python Scraper running on a home server.

## Tech Stack
- **Monorepo Structure:**
  - `/web`: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
  - `/scraper`: Python 3.x, BeautifulSoup4, cloudscraper, Supabase Python Client.
  - `/supabase`: SQL Migrations and local config.
- **Database:** Supabase (PostgreSQL).
- **Auth:** Supabase Auth (Google OAuth, restricted to `@umich.edu`).
- **Hosting:** Frontend (Vercel), Backend/DB (Supabase Free Tier), Scraper (Self-Hosted).

## Architecture & Data Rules (CRITICAL)

### 1. The "Chicken Tender Paradox" (Location Specificity)
- **Rule:** Food items are **NOT** global. A "Chicken Tender" at Bursley is a different database entity than a "Chicken Tender" at Mosher-Jordan.
- **Why:** This allows different ratings/photos for the same food name at different locations.
- **Schema:** The `items` table has a `dining_hall_id`. Unique Constraint: `unique(dining_hall_id, name)`.

### 2. Scraping Strategy
- **Method:** We use `cloudscraper` to bypass Cloudflare 403 Forbidden errors.
- **Identification:** We identify dining halls by their **URL Slug** (e.g., `bursley`, `mosher-jordan`), NOT by the internal M-Dining ID.
- **Upsert Logic:** Scrapers must first check if an item exists (`select id from items where name=X and dining_hall_id=Y`) before inserting to prevent duplicates.

### 3. Database Schema Summary
- **`dining_halls`**: Static list of 7 halls. Key field: `slug`.
- **`items`**: The food concepts. Includes `nutrition_score` (1-6) and `dietary_tags` (Array).
- **`menu_events`**: Join table linking `items` + `dining_halls` + `date` + `meal` (Enum: Breakfast, Brunch, Lunch, Dinner).
- **`user_ratings`**: Linked to `items` (not events).
- **`photos`**: Linked to `items`. Needs approval (`is_approved` bool).

## Coding Standards

### Frontend (`/web`)
- **Framework:** Use Next.js App Router (`app/` directory). Server Components by default.
- **Styling:** Use Tailwind CSS.
  - **Maize:** `#FFCB05`
  - **Blue:** `#00274C`
- **Data Fetching:** Use the Supabase JS Client (`@supabase/ssr`).
- **Images:** heavily compress images on the client (`browser-image-compression`) before uploading to Supabase Storage to save space.

### Scraper (`/scraper`)
- **Libraries:** Use `cloudscraper` for requests, `bs4` for parsing.
- **Error Handling:** Never crash the whole script on one bad item. Log and continue.
- **Environment:** Requires `SUPABASE_SERVICE_ROLE_KEY` (Legacy/Long-lived key) for write access.

## Common commands
- **Start Web:** `npm run dev` (in `/web`)
- **Run Scraper:** `python main.py` (in `/scraper`)
- **Update DB Types:** `npx supabase gen types typescript --local > web/types/supabase.ts`
