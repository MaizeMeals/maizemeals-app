# MaizeMeals

> **A modern, student-built dining companion for the University of Michigan.**

**Disclaimer:** This application is a student project and is not affiliated with, endorsed by, or sponsored by the University of Michigan. All trademarks, logos, and service marks (including "M Dining" and university colors) displayed are the property of their respective owners. Menu data is scraped for educational purposes and may not be accurate.

---

## About

MaizeMeals is a full-stack web application designed to help U-M students navigate campus dining. Unlike the official static menus, MaizeMeals offers:

* **Real-time Menu Data:** Scraped daily from M-Dining.
* **Crowdsourced Ratings:** Find out if the "Chicken Broccoli Bake" is actually good.
* **Smart Nutrition:** Filter by "High Protein" or specific allergens.

## Tech Stack

### Frontend (`/web`)

* **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + shadcn/ui
* **Auth:** Supabase Auth (Google OAuth w/ `@umich.edu` restriction)
* **Hosting:** Vercel

### Backend & Data (`/scraper`, `/supabase`)

* **Database:** Supabase (PostgreSQL)
* **Scraper:** Python 3.x + `cloudscraper` (to bypass Cloudflare WAF)
* **Infrastructure:** Supabase Cloud + Local Supabase CLI

---

## 🚀 Getting Started

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

### 2. Frontend Setup (`/web`)

```bash
cd web
npm install

# Create environment file
cp .env.example .env.local

```

**Configure `.env.local`:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

```

**Run Development Server:**

```bash
npm run dev
# Open http://localhost:3000

```

### 3. Scraper Setup (`/scraper`)

The scraper runs independently to populate the database.

```bash
cd scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

```

**Configure `.env` in `/scraper`:**

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-service-role-key>  # MUST be Service Role for writing!
GEMINI_API_KEY=<your-gemini-api-key>

```

**Run the Scraper:**

```bash
python main.py

```

---

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes.
4. **Important:** If you change the database schema, please include a migration file in `supabase/migrations`.

## License

[GNU GENERAL PUBLIC LICENSE V3](https://www.gnu.org/licenses/gpl-3.0.en.html)
