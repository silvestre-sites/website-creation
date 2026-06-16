-- schema.sql
-- Cloudflare D1 Relational DB definition for Silvestre Solutions platform

DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS lead_custom_fields;
DROP TABLE IF EXISTS lead_notes;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS agents;

-- Agents Table (Acting as the USERS table for Hono Auth API)
-- Exact columns mapped:
--   - email: Used as the unique ID / user lookup identifier
--   - name: Full name of the user/agent
--   - password: Password plaintext/SHA-256 (corresponds to password_hash request; mapped as 'password' to fit Hono login logic)
--   - is_admin: Represents the role ('Admin' when 1, 'Agent' when 0)
--   - country: User's location country
--   - avatar_url: Path to the user picture file (stored in Cloudflare R2 bucket)
CREATE TABLE agents (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL, -- Exact column name used in our Hono auth logic to avoid Schema Instability
    whatsapp TEXT NOT NULL,
    country TEXT NOT NULL,
    languages TEXT NOT NULL,
    experience TEXT NOT NULL,
    is_approved INTEGER DEFAULT 0, -- 0 for Agent false, 1 for Agent true
    did_pass_quiz INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0, -- 1 for Admin role
    is_super_admin INTEGER DEFAULT 0,
    is_frozen INTEGER DEFAULT 0,
    avatar_url TEXT
);

-- Tickets Table (Support ticket queue)
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL, -- "Low", "Medium", "High"
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table (Marketplace opportunites & aggregate key metrics)
CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    country TEXT NOT NULL,
    est_value REAL NOT NULL,
    payout REAL NOT NULL,
    earnings_currency TEXT NOT NULL, -- USD, EUR, BRL, MZN, ZAR
    status TEXT NOT NULL, -- "Available", "Claimed", "In Progress", "Completed", "Sold"
    claimed_by TEXT, -- agent email referencing agents(email)
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_role TEXT,
    social_linkedin TEXT,
    social_facebook TEXT,
    social_whatsapp TEXT,
    social_twitter TEXT,
    prototype_url TEXT NOT NULL,
    description TEXT,
    is_frozen INTEGER DEFAULT 0,
    commission_paid INTEGER DEFAULT 0,
    commission_paid_date TEXT,
    commission_proof_name TEXT,
    commission_proof_url TEXT,
    FOREIGN KEY(claimed_by) REFERENCES agents(email)
);

-- Lead Notes Table (One-to-Many on Leads)
CREATE TABLE lead_notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Lead Custom Profile Fields (One-to-Many on Leads)
CREATE TABLE lead_custom_fields (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    title TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Setup initial Superadmin seed
INSERT INTO agents (email, name, password, whatsapp, country, languages, experience, is_approved, did_pass_quiz, is_admin, is_super_admin)
VALUES ('olisbel@gmail.com', 'Olisbel (Super Admin)', '19921108626', '+1000000000', 'United Kingdom', 'EN, PT', '10', 1, 1, 1, 1);

