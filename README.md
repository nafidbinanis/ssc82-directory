# SSC 1982 Batch Telephone Directory

A full-stack web application built from the `SSC_1982_Telephone_Directory.xlsx` workbook — a
64-sheet register (one sheet per Bangladeshi district) listing members of the SSC 1982 batch.
The app lets General Users search and browse the directory, and lets Admins add, edit, delete,
and audit records, with a live dashboard of batch statistics.

---

## 1. Source Data Analysis

**Workbook:** 64 worksheets, one per district (e.g. `Dhaka`, `Chattogram`, `Cumilla`…), each with
the identical 9-column layout:

| Excel Column | Meaning | Notes |
|---|---|---|
| Name | Person's full name | Always present |
| School Name & District | School attended + its district | Free text, combined field in the source |
| Home District | Person's home district | Sometimes spelled differently from the sheet name (e.g. "Barishal" vs sheet "Barisal") — the sheet name was used as the canonical district |
| Profession | Occupation | 112 of 1,665 blank |
| Current Location | Where they currently live | 22 blank |
| Contact Number | Phone number(s) | Stored inconsistently in Excel — see cleaning notes below |
| Blood Group | Blood type | 199 blank |
| Photo | Almost entirely empty (one cell contained a note in Bengali declining to share a photo) | Not treated as a real data field |
| E-mail | Email address | 593 blank |

**Total real records found:** 1,665 people (after skipping ~62,000 blank template rows — every
sheet was pre-formatted to 1,000 rows regardless of how many were actually filled in).

**Data quality issues identified and handled:**
- **Inconsistent phone formats** — stored as Excel numbers missing their leading `0`
  (`1819221833` → `01819221833`), as comma/newline/slash-separated multiple numbers, and as
  international numbers with `+`, spaces and parentheses. The import script normalizes these into
  `phone_primary` / `phone_secondary`, restoring the leading zero for local 11-digit numbers.
- **Invisible Unicode control characters** (right-to-left marks, non-breaking spaces) inside phone
  and text fields — stripped during cleaning.
- **Placeholder values** (`-`, `--`, blank) — normalized to `NULL` so the UI can render "Not
  recorded" instead of a stray dash.
- **69 repeated names** — expected in a batch this size (common Bengali names); **not** treated as
  duplicates on their own.
- **4 genuine probable duplicate entries**, detected by exact email match (e.g. "Rtn Rokeya
  Sultana" appears twice with minor spelling differences but the same email and phone). These are
  flagged with `is_duplicate_of` rather than silently deleted, so an admin can review and merge
  them manually. See `docs/duplicate_report.json`.
- **District spelling variants** (Barisal/Barishal, Sirajganj/Sirajgonj, Netrokona/Netrakona,
  Munshiganj/Munsiganj) — the original worksheet name was used as the single source of truth for
  the `district` field, while the as-typed value is preserved separately in `home_district_raw` so
  no original data is lost.

No column was discarded. Every field from the sheet is represented in the database, the API, and
the Add/Edit form.

---

## 2. System Architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   React SPA (Vite)  │ ───────────────────────▶ │  Express REST API    │
│  - Dashboard         │ ◀─────────────────────── │  - JWT auth          │
│  - Directory/Search  │                            │  - Validation        │
│  - Person form        │                           │  - Activity logging  │
│  - Activity log        │                          └──────────┬───────────┘
└─────────────────────┘                                        │
                                                                  ▼
                                                        ┌──────────────────┐
                                                        │  SQLite database  │
                                                        │  (better-sqlite3) │
                                                        └──────────────────┘
```

- **Frontend:** React 19 + Vite + Tailwind CSS + React Router + Recharts + Axios.
- **Backend:** Node.js + Express, `pg` (node-postgres) for the database, `jsonwebtoken` +
  `bcryptjs` for authentication.
- **Database:** PostgreSQL — see "Why PostgreSQL" below.

### Why PostgreSQL (vs SQLite / Firebase / MySQL)
The project originally shipped with SQLite (a single embedded file, zero infrastructure), which is
great for running locally but doesn't survive free-tier hosting: most free hosts wipe their disk
on every restart/redeploy, which would silently delete the directory's data. The app now uses
PostgreSQL instead, pointed at a free hosted database (e.g. Supabase or Neon) that persists
independently of wherever the backend itself is deployed — see the **Free Deployment Guide**
below. The schema is fully normalized (see below) and the SQL avoids Postgres-only features beyond
standard `SERIAL`/`TIMESTAMPTZ` types, so moving to MySQL later would be a small, mechanical
change if ever needed.

---

## 3. Database Schema (normalized)

```sql
users            (id, name, email, password_hash, role['admin'|'user'], created_at)
districts        (id, name)                                   -- lookup table, one row per district
people           (id, district_id → districts.id, name, school_name_district, home_district_raw,
                   profession, current_location, phone_primary, phone_secondary, phone_raw,
                   blood_group, email, email_valid, is_duplicate_of → people.id,
                   source_row_id, created_by → users.id, created_at, updated_at)
activity_log     (id, action['CREATE'|'UPDATE'|'DELETE'|'IMPORT'], entity_id, person_name,
                   performed_by → users.id, performed_by_name, details JSON,
                   total_records_after, created_at)
```

Full DDL: [`backend/db/schema.sql`](backend/db/schema.sql).

District is normalized into its own table (rather than a free-text column on `people`) so filters
and district-level statistics are fast and consistent, while `home_district_raw` preserves exactly
what the original sheet said for full traceability.

---

## 4. Search & Filtering

Search runs as a single `LIKE '%term%'` query across `name`, `school_name_district`,
`home_district_raw`, `profession`, `current_location`, `phone_primary`, `phone_secondary`,
`blood_group`, `email`, and the joined `district` name — combined with `OR`. This correctly
supports every example in the brief:

- `Doctor` → matches profession substrings
- `Kamal` → matches name substrings, case-insensitive
- `Sirajganj` → matches district
- `gmail.com` → matches email domain
- `017` → matches phone prefix
- a full email → matches that person exactly

All searchable columns are indexed, and with ~1,700 rows this comfortably returns in a few
milliseconds. Filters (District, Occupation, Blood Group) are applied as additional `AND`
conditions and combine with search and with each other. Results are paginated (20/page) and
sortable by name, district, occupation, blood group, or date added.

---

## 5. Screens

| Screen | Route | Access |
|---|---|---|
| Login | `/login` | Public |
| Dashboard (totals, charts, recent activity, data-quality) | `/` | All logged-in users |
| Directory (search, filter, sort, paginate) | `/directory` | All logged-in users |
| Person detail | `/directory/:id` | All logged-in users |
| Add person | `/directory/new` | Admin only |
| Edit person | `/directory/:id/edit` | Admin only |
| Activity log | `/activity` | Admin only |

General users can search, view, and filter, but never see Add/Edit/Delete controls or the
Activity Log — enforced both in the UI (route guards) and in the API (role-checked middleware).

---

## 6. Folder Structure

```
ssc82-directory/
├── backend/
│   ├── server.js              # Express entrypoint
│   ├── db/
│   │   ├── schema.sql         # Full normalized Postgres schema (idempotent)
│   │   ├── index.js           # Postgres connection pool bootstrap
│   │   └── seed.js            # Loads data/people_seed.json into Postgres
│   ├── .env.example           # Copy to .env and fill in DATABASE_URL + JWT_SECRET
│   ├── routes/
│   │   ├── auth.js            # POST /login, GET /me
│   │   ├── people.js          # Search/filter/CRUD + /meta/options
│   │   ├── stats.js           # GET /stats for the dashboard
│   │   └── activity.js        # GET /activity (admin only)
│   ├── middleware/auth.js     # JWT verification + role guards
│   └── data/people_seed.json  # Cleaned data extracted from the Excel file
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard, Directory, PersonDetail, PersonForm, ActivityLog, Login
│       ├── components/         # Layout, Pagination, BloodGroupBadge, BatchEmblem, ProtectedRoute
│       ├── context/AuthContext.jsx
│       └── lib/api.js
├── data/people_seed.json       # Canonical cleaned dataset (source of truth for re-seeding)
├── docs/duplicate_report.json  # Flagged probable-duplicate groups for manual review
└── clean_data.py                # One-time Excel → JSON cleaning script (for full traceability)
```

---

## 7. Installation Guide (local development)

**Prerequisites:** Node.js 18+, npm, and a Postgres database to point at. For quick local testing
you have two options:

- **Easiest — skip installing Postgres locally** and just point `DATABASE_URL` at a free Supabase
  project (see §8 below, step 1) even while developing on your own machine.
- **Or install Postgres locally** (e.g. `sudo apt install postgresql` on Linux, or
  [postgresapp.com](https://postgresapp.com) on Mac, or the installer at
  [postgresql.org/download](https://www.postgresql.org/download/) on Windows) and create a
  database: `createdb ssc82_directory`.

```bash
# 1. Backend
cd backend
cp .env.example .env      # then edit .env and fill in DATABASE_URL + a real JWT_SECRET
npm install
npm run seed               # creates tables and imports all 1,665 people
npm start                  # → http://localhost:4000

# 2. Frontend (in a new terminal)
cd frontend
cp .env.example .env       # defaults to http://localhost:4000/api, edit if needed
npm install
npm run dev                # → http://localhost:5173
```

**Demo logins** (seeded automatically):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ssc82.local` | `admin123` |
| General User | `viewer@ssc82.local` | `user123` |

> Change these credentials (and `JWT_SECRET`) before letting anyone outside your own machine use
> the app.

To re-import from a fresh copy of the Excel file, re-run `python3 clean_data.py` (requires
`pip install openpyxl`) to regenerate `data/people_seed.json`, then `npm run seed -- --full` in
`backend/` to rebuild the database from scratch, including resetting user accounts.

---

## 8. Free Deployment Guide (Vercel + Render + Supabase)

This puts the site on the public internet, entirely on free tiers, with data that survives
backend restarts and redeploys. Free-tier limits and steps on any of these providers can shift
over time, so if a screen doesn't match exactly what's described, look for the nearest equivalent
option — the overall flow will be the same.

### Step 1 — Create the database (Supabase)

1. Go to **[supabase.com](https://supabase.com)** and sign up (free).
2. Create a new project. Pick any name/region; set and save a database password.
3. Once it's ready, go to **Project Settings → Database → Connection string**, select the **URI**
   tab, and choose the **Transaction pooler** connection mode. Copy that string — it looks like
   `postgres://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres`.
   Replace `[YOUR-PASSWORD]` with the database password you set.
4. Save this as `DATABASE_URL` — you'll paste it into Render in Step 3.

### Step 2 — Push the project to GitHub

Both Render and Vercel deploy from a GitHub repository.

1. Create a free account at **[github.com](https://github.com)** if you don't have one.
2. Create a new, empty repository (e.g. `ssc82-directory`).
3. From inside your project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/ssc82-directory.git
   git push -u origin main
   ```

### Step 3 — Deploy the backend (Render)

1. Go to **[render.com](https://render.com)** and sign up, then connect your GitHub account.
2. Click **New → Web Service**, select your `ssc82-directory` repo.
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   - `DATABASE_URL` → the Supabase connection string from Step 1
   - `JWT_SECRET` → a long random string (not the demo one)
   - `PORT` → `4000`
5. Deploy. Once it's live, copy the URL Render gives you, e.g. `https://ssc82-backend.onrender.com`.
6. **Seed the database** (one-time): in the Render dashboard, open a **Shell** for this service
   and run:
   ```bash
   npm run seed
   ```
   This populates your Supabase database with all 1,665 people and creates the demo accounts.

> Render's free web services go to sleep after ~15 minutes without traffic and take 30–60 seconds
> to wake back up on the next visit — normal for a free tier, and your data is unaffected either
> way since it lives in Supabase, not on Render's disk.

### Step 4 — Deploy the frontend (Vercel)

1. Go to **[vercel.com](https://vercel.com)** and sign up, then connect your GitHub account.
2. Click **Add New → Project**, select your `ssc82-directory` repo.
3. Set **Root Directory** to `frontend` (Vercel should auto-detect the Vite framework preset).
4. Under **Environment Variables**, add:
   - `VITE_API_URL` → your Render backend URL + `/api`, e.g.
     `https://ssc82-backend.onrender.com/api`
5. Deploy. Vercel gives you a public URL like `https://ssc82-directory.vercel.app` — that's the
   link you can share with anyone.

### Step 5 — Test it

Open your Vercel URL, log in with the demo admin account, and confirm you can search, add, and
edit a record. Then change the demo passwords (see §7) before sharing the link widely.

---

## 9. Future Improvements

- **Merge tool** for the 4 flagged probable duplicates (and any new ones the app detects as data
  grows), instead of just flagging them.
- **Bulk import UI** for admins to upload a new Excel/CSV batch directly from the browser (the
  cleaning logic in `clean_data.py` would move server-side).
- **Password reset / invite flow** instead of shared demo credentials.
- **Photo uploads** — the schema already reserves a `photo_note` column; a real image field and
  storage (e.g. S3-compatible bucket) could be added without breaking existing data.
- **Export** filtered results to CSV/PDF for offline batch reunions or printed booklets.
- **Multi-district admin roles** (e.g. a district-level moderator who can only edit their own
  district's entries).
- **Migrate to PostgreSQL** if usage grows beyond a single-server, single-file SQLite deployment.
