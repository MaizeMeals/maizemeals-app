# Project Context: U-M Dining App ([placeholder])

## Overview
This is a student-focused dining companion app for the University of Michigan. It allows students to view daily menus, rate food items, upload photos, and track nutrition. It uses a "Split Architecture" with a Next.js frontend hosted on Vercel and a Python Scraper running on a home server.

## Tech Stack
- **Monorepo Structure:**
  - `/web`: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
  - `/scraper`: Python 3.x, cloudscraper (HTTP client for the M-Dining JSON API), python-dotenv, Supabase Python Client. `requirements.txt` also lists beautifulsoup4; the scraper parses JSON responses.
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
- **Method:** We call the M-Dining JSON API. `cloudscraper` is the HTTP client (it can get past a Cloudflare 403).
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
- **Libraries:** Use `cloudscraper` for HTTP requests and parse the M-Dining JSON body.
- **Error Handling:** Never crash the whole script on one bad item. Log and continue.
- **Environment:** Requires `SUPABASE_URL` and `SUPABASE_KEY` (service role) for write access. Both the web dev server and the scraper load the repo-root `.env`.

## Common commands
- **Start Web:** `npm run dev` (in `/web`)
- **Run Scraper:** `python main.py` (in `/scraper`)
- **Update DB Types:** `npx supabase gen types typescript --local > web/types/supabase.ts`

---

## 📊 Analytics Architecture (PostHog)

The project uses **PostHog** for product analytics, session replay, and feature flags.

### **1. Core Principles**

* **Adapter Pattern:** Do **not** import `posthog-js` directly in components. Always use the custom `useAnalytics` hook. This decouples our code from the vendor.
* **Privacy First:** We **never** send PII (Email, Name, Phone) to PostHog. Users are identified solely by their Supabase UUID.
* **Proxying:** Traffic is routed through `/ingest` (via `next.config.ts` rewrites) to bypass ad-blockers and ensure data accuracy.

### **2. Client-Side Usage**

Use the `useAnalytics` hook for all frontend interactions.

```tsx
import { useAnalytics } from "@/hooks/use-analytics"

export function MyComponent() {
  const { track } = useAnalytics()

  const handleClick = () => {
    track('feature_clicked', {
      location: 'sidebar',
      status: 'active'
    })
  }
}

```

### **3. Server-Side Usage (API Routes)**

For backend logic (e.g., Auth callbacks), use the server client.

```typescript
import { getPostHogClient } from "@/lib/posthog-server"

const posthog = getPostHogClient()
posthog.capture({
  distinctId: user.id,
  event: 'api_action_completed',
  properties: { ... }
})
await posthog.shutdown() // ⚠️ MANDATORY: Flushes events before Vercel kills the lambda

```

### **4. Naming Conventions**

* **Events:** `snake_case` (e.g., `menu_item_viewed`, `crowd_meter_loaded`).
* **Properties:** `snake_case` (e.g., `dining_hall`, `is_logged_in`).
* **Feature Flags:** `kebab-case` (e.g., `enable-crowd-meter`).

### IMPORTANT: IMPORTING ADDITIOANL COMPONENTS.
if importing from standard libraries such as shadcn, radix, etc; please feel free to do so; do NOT attempt to build these components from scratch and "re-invent the wheel" simply prompt the user if they can install those components.
