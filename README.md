# MaizeMeals

> **A modern, student-built dining companion for the University of Michigan.**

**Disclaimer:** This application is a student project and is not affiliated with, endorsed by, or sponsored by the University of Michigan. All trademarks, logos, and service marks (including "M Dining" and university colors) displayed are the property of their respective owners. Menu data comes from the M-Dining JSON API for educational purposes and may not be accurate.

---

## About

MaizeMeals is a full-stack web application designed to help U-M students navigate campus dining. Unlike the official static menus, MaizeMeals offers:

* **Real-time Menu Data:** Loaded from the M-Dining JSON API.
* **Crowdsourced Ratings:** Find out if the "Chicken Broccoli Bake" is actually good.
* **Smart Nutrition:** Filter by "High Protein" or specific allergens.

## Tech Stack

### Frontend (`/web`)

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, `next` 16.1.6)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + shadcn/ui
* **Auth:** Supabase Auth (Google OAuth w/ `@umich.edu` restriction)
* **Hosting:** Vercel

### Backend & Data (`/scraper`, `/supabase`)

* **Database:** Supabase (PostgreSQL)
* **Scraper:** Python 3.x calling the M-Dining JSON API (`MDINING_API_KEY`, `MDINING_BASE_URL`). The HTTP client is `cloudscraper`. `scraper/requirements.txt` installs `beautifulsoup4`, `cloudscraper`, `python-dotenv`, and `supabase`. The scraper code parses the JSON API responses; `beautifulsoup4` is present in that requirements list and is unused by the current modules.
* **Infrastructure:** Supabase Cloud + Local Supabase CLI

---

## Getting Started

### Prerequisites

* Node.js 20+
* Python 3.10+
* [Supabase CLI](https://supabase.com/docs/guides/cli)
* [Google Gemini CLI](https://geminicli.com/) (Optional, for dev workflow)

### 1. Database Setup

We use Supabase for the database. You can run it locally or link to the cloud.

```bash
# Install Supabase CLI dependencies
npm install -g supabase

# Login and link to your cloud project
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Push latest schema to cloud (if needed)
npx supabase db push

```

### 2. Environment file (repository root)

`npm run dev` in `web/` runs `dotenv -e ../.env -- next dev`. `scraper/lib/api.py` loads `Path(__file__).parent.parent.parent / '.env'`. From `scraper/lib/api.py`, that path is the repository-root `.env`. Use that one file for local web and scraper secrets.

```bash
cp .env.example .env
```

Fill in `.env` (it is gitignored). `.env.example` keeps empty placeholders. `web/.env.example` only points back at this root file.

`next build` and `next start` read the process environment. For a local build from `web/`, export the variables or run `npx dotenv -e ../.env -- npx next build`. Vercel supplies them on deploy.

#### Web

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client and server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_KEY` | Service role key. Server only. `web/lib/supabase/admin.ts` reads `SUPABASE_KEY`. |
| `ADMIN_USER_IDS` | Comma-separated user UUIDs allowed into admin routes |
| `CRON_SECRET` | Bearer secret for the daily-digest cron route |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Verified Resend sender |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key. Analytics stay off when this is empty. |
| `NEXT_PUBLIC_SITE_URL` | Preferred public origin for OAuth callbacks |
| `MDINING_API_KEY` | M-Dining JSON API key (capacity route) |
| `MDINING_BASE_URL` | M-Dining API base URL |

#### Scraper

Same root `.env`. The scraper reads `SUPABASE_URL` (its own name for the project URL) plus the shared `SUPABASE_KEY`, `MDINING_API_KEY`, and `MDINING_BASE_URL`.

| Variable | Role |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Service role key, used for writes |
| `MDINING_API_KEY` | M-Dining JSON API key |
| `MDINING_BASE_URL` | M-Dining API base URL |
| `DISCORD_WEBHOOK_URL` | Optional. Failure-alert webhook. Leave empty to skip. |

#### Optional tooling

Root `package.json` only. The app and the scraper boot without these.

| Variable | Role |
| --- | --- |
| `PROD_DB_URL` | `npm run db:pull-prod` |
| `SUPABASE_PROJECT_ID` | `npm run gen:types` |

### 3. Frontend (`/web`)

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000

```

### 4. Scraper (`/scraper`)

The scraper writes menus into Supabase. It uses the repository-root `.env` from step 2.

```bash
cd scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

python main.py

```

### Auth redirect allow-list

`getURL()` builds the OAuth callback origin (`${getURL()}/auth/callback` in the login route). It prefers `NEXT_PUBLIC_SITE_URL`. It uses `VERCEL_PROJECT_PRODUCTION_URL` only when `VERCEL_ENV` is `production`; otherwise it uses `VERCEL_URL`; otherwise `http://localhost:3000`. Preview deployments therefore send OAuth callbacks to the preview origin.

The owner adds each preview URL to the Supabase Auth redirect allow-list in the dashboard (**Authentication → URL Configuration**). This repository leaves those Supabase settings unchanged.

Allow the production URL, `http://localhost:3000`, and Vercel preview origins. A pattern such as `https://*.vercel.app` is a reasonable starting point. If that wildcard is rejected, add the preview origin Supabase shows in the auth error, and include `/auth/callback` (for example `https://<preview-host>/auth/callback` and `http://localhost:3000/auth/callback`).

---

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes.
4. **Important:** If you change the database schema, please include a migration file in `supabase/migrations`.

## License

[GNU GENERAL PUBLIC LICENSE V3](https://www.gnu.org/licenses/gpl-3.0.en.html)
