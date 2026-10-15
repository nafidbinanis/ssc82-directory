# SSC 1982 Batch Telephone Directory

> A full-stack web application that digitizes and makes searchable a 64-district alumni telephone directory of 1,665 members from Bangladesh's SSC 1982 batch.

**[🔗 Live Demo](https://ssc82-directory.vercel.app)** &nbsp;|&nbsp; Built with React · Node.js · PostgreSQL · Deployed on Vercel + Render + Supabase

---

## Overview

The SSC 1982 Batch Telephone Directory was originally maintained as a 64-sheet Excel workbook — one sheet per Bangladeshi district — with no way to search, filter, or manage records online. This project transforms that static workbook into a searchable, role-based web application with an admin audit trail.

**General users** can search, filter, and browse all 1,665 records. **Admins** can add, edit, delete, and audit every change made to the directory.

---

## Features

- 🔍 **Full-text search** across name, phone, email, profession, district, and current location
- 🗂️ **Filter by** district, occupation, and blood group — combinable with search
- 📊 **Admin dashboard** with live batch statistics and data-quality indicators
- 📋 **Activity log** for every create, update, delete, and import action (admin only)
- 🔐 **Role-based access control** — General User vs Admin, enforced in both UI and API
- 🔑 **JWT authentication** with bcrypt password hashing
- 📱 **Responsive design** — works on desktop and mobile
- 🧹 **Clean data** — phone normalization, duplicate flagging, Unicode artifact removal

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router, Recharts, Axios |
| Backend | Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs` |
| Database | PostgreSQL (hosted on Supabase) |
| Data cleaning | Python 3, `openpyxl` |
| Deployment | Vercel (frontend), Render (backend), Supabase (database) |

---

## Architecture

```
┌─────────────────────┐        HTTPS / JSON       ┌──────────────────────┐
│   React SPA (Vite)  │ ─────────────────────────▶ │  Express REST API    │
│  · Dashboard        │ ◀───────────────────────── │  · JWT auth          │
│  · Directory/Search │                             │  · Input validation  │
│  · Person form      │                             │  · Activity logging  │
│  · Activity log     │                             └──────────┬───────────┘
└─────────────────────┘                                        │
                                                               ▼
                                                   ┌──────────────────────┐
                                                   │  PostgreSQL (Supabase)│
                                                   │  · people            │
                                                   │  · districts         │
                                                   │  · users             │
                                                   │  · activity_log      │
                                                   └──────────────────────┘
```

### Database Schema (normalized)

```sql
users        (id, name, email, password_hash, role['admin'|'user'], created_at)
districts    (id, name)
people       (id, district_id, name, school_name_district, home_district_raw,
              profession, current_location, phone_primary, phone_secondary,
              blood_group, email, is_duplicate_of, created_by, created_at, updated_at)
activity_log (id, action, entity_id, person_name, performed_by,
              performed_by_name, details JSON, total_records_after, created_at)
```

Full schema: [`backend/db/schema.sql`](backend/db/schema.sql)

---

## Data Source & Cleaning

The source workbook contained **64 worksheets** (one per district), pre-formatted to 1,000 rows each, with only 1,665 rows actually filled. The [`clean_data.py`](clean_data.py) script handled:

- **Phone normalization** — restored leading zeros stripped by Excel, split multi-number fields into `phone_primary` / `phone_secondary`
- **Unicode artifacts** — stripped invisible control characters (RTL marks, non-breaking spaces)
- **Placeholder values** — normalized `-`, `--`, and blank cells to `NULL`
- **Duplicate detection** — flagged 4 probable duplicates by exact email match; stored in [`docs/duplicate_report.json`](docs/duplicate_report.json) for admin review
- **District canonicalization** — resolved spelling variants (e.g. Barisal/Barishal) using the worksheet name as the source of truth, preserving raw values in `home_district_raw`

---

## Getting Started (Local Development)

**Prerequisites:** Node.js 18+, npm, and a PostgreSQL database (local or Supabase free tier)

```bash
# 1. Clone the repository
git clone https://github.com/nafidbinanis/ssc82-directory.git
cd ssc82-directory

# 2. Backend setup
cd backend
cp .env.example .env        # Fill in DATABASE_URL and JWT_SECRET
npm install
npm run seed                 # Creates tables and imports all 1,665 records
npm start                    # Runs on http://localhost:4000

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env         # Set VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                  # Runs on http://localhost:5173
```

**Demo credentials (seeded automatically):**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ssc82.local` | `admin123` |
| General User | `viewer@ssc82.local` | `user123` |

> ⚠️ Change these credentials and `JWT_SECRET` before sharing the app publicly.

---

## Free Deployment Guide

Deploy the full stack for free using **Vercel + Render + Supabase**:

1. **Database (Supabase)** — Create a free project at [supabase.com](https://supabase.com), copy the PostgreSQL connection URI from *Project Settings → Database → Connection string (Transaction pooler)*
2. **Backend (Render)** — Create a Web Service pointing at the `backend/` folder. Set `DATABASE_URL`, `JWT_SECRET`, and `PORT=4000` as environment variables. After deploy, run `npm run seed` from the Render shell
3. **Frontend (Vercel)** — Import the repo, set Root Directory to `frontend/`, add `VITE_API_URL=https://<your-render-url>/api` as an environment variable, and deploy

> Render free-tier services sleep after ~15 minutes of inactivity and take 30–60 seconds to wake — your data in Supabase is unaffected.

---

## App Screens

| Screen | Route | Access |
| --- | --- | --- |
| Login | `/login` | Public |
| Dashboard | `/` | All logged-in users |
| Directory (search, filter, sort, paginate) | `/directory` | All logged-in users |
| Person detail | `/directory/:id` | All logged-in users |
| Add person | `/directory/new` | Admin only |
| Edit person | `/directory/:id/edit` | Admin only |
| Activity log | `/activity` | Admin only |

---

## Future Improvements

- [ ] Merge UI for the 4 flagged probable duplicates
- [ ] Bulk import via browser UI (move `clean_data.py` logic server-side)
- [ ] Password reset and invite flow
- [ ] Photo uploads (schema column already reserved)
- [ ] Export filtered results to CSV or PDF
- [ ] Multi-district admin roles

---

## Author

Built by **[Nafid Bin Anis](https://github.com/nafidbinanis)** — BSc Computer Science & Engineering student at BRAC University, Dhaka.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-nafid--bin--anis-blue?logo=linkedin)](https://www.linkedin.com/in/nafid-bin-anis)
