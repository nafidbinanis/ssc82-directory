-- SSC 1982 Batch Telephone Directory - Database Schema
-- Engine: PostgreSQL (via node-postgres / pg)
-- This replaces the original SQLite schema. FTS5 is SQLite-only and has been
-- removed — full-text search isn't needed since the app's actual search
-- implementation already does a multi-column ILIKE query (see routes/people.js).

-- ============================================================
-- USERS  (Admin / General User authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DISTRICTS (lookup / normalization table)
-- One row per Bangladeshi district represented in the workbook
-- ============================================================
CREATE TABLE IF NOT EXISTS districts (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- ============================================================
-- PEOPLE  (core directory table - one row per person)
-- ============================================================
CREATE TABLE IF NOT EXISTS people (
    id                    SERIAL PRIMARY KEY,
    district_id           INTEGER NOT NULL REFERENCES districts(id),
    name                  TEXT NOT NULL,
    school_name_district  TEXT,
    home_district_raw     TEXT,
    profession            TEXT,
    current_location      TEXT,
    phone_primary         TEXT,
    phone_secondary       TEXT,
    phone_raw             TEXT,
    blood_group           TEXT,
    email                 TEXT,
    email_valid           BOOLEAN,
    photo_note            TEXT,
    is_duplicate_of       INTEGER REFERENCES people(id),
    source_row_id         INTEGER,
    created_by            INTEGER REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_name        ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_district     ON people(district_id);
CREATE INDEX IF NOT EXISTS idx_people_profession   ON people(profession);
CREATE INDEX IF NOT EXISTS idx_people_blood_group  ON people(blood_group);
CREATE INDEX IF NOT EXISTS idx_people_email        ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_phone        ON people(phone_primary);

-- ============================================================
-- ACTIVITY LOG (audit trail of add/edit/delete/import actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id                   SERIAL PRIMARY KEY,
    action               TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'IMPORT')),
    entity_type          TEXT NOT NULL DEFAULT 'person',
    entity_id            INTEGER,
    person_name          TEXT,
    performed_by         INTEGER REFERENCES users(id),
    performed_by_name    TEXT,
    details              TEXT,
    total_records_after  INTEGER,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
