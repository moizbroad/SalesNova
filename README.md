# StrategistHub CRM

A sales CRM for StrategistHub — track **contacts** (leads) through their pipeline,
convert qualified ones into **deals** (opportunities), and report on both.

Built with **Next.js 16**, **Supabase** (Postgres + Auth), and **Tailwind CSS**.

---

## What it does

- **Contacts** — add leads, move them through stages (New → Qualified), log notes,
  conversations, and meetings. Every stage change is recorded automatically.
- **Deals** *(admin-only)* — convert a contact into a deal, manage a pipeline
  (Board + Table views with drag-and-drop), track stage history, add deal notes,
  and view reports (open pipeline, win rate, won/lost).
- **Roles** — two roles:
  - **admin** — full access, including the entire Deals module.
  - **sdr** — works contacts only; cannot see or open anything deal-related.
- **Sign-in** — passwordless. Users receive a **6-digit code** by email (with a
  magic-link fallback). Only emails an admin has added can sign in.

---

## How to run it locally (step by step)

### 1. Prerequisites
- **Node.js 20 or newer** (check with `node -v`)
- A **Supabase** project (free tier is fine) — https://supabase.com

### 2. Get the code
```bash
git clone https://github.com/mizkhan/Sh-Crm.git
cd Sh-Crm
npm install
```

### 3. Add your environment variables
Copy the example file and fill in your Supabase keys:
```bash
cp .env.example .env.local
```
Then open `.env.local` and paste the values from
**Supabase → Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=...          # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # anon / public key
SUPABASE_SERVICE_ROLE_KEY=...         # service_role key (keep secret)
```
> `.env.local` is gitignored and never committed.

### 4. Set up the database
In **Supabase → SQL Editor → New query**, run each migration **in order**
(copy-paste the file contents and click Run):

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_avatars_storage.sql`
3. `supabase/migrations/0003_branding_storage.sql`
4. `supabase/migrations/0004_deals.sql`

This creates all tables, security rules, and triggers.

### 5. Create the first admin user
Sign-up is closed, so create the admin by hand:
1. **Supabase → Authentication → Users → Add user** → enter the admin's email
   (auto-confirm it).
2. **Supabase → SQL Editor** → make them an admin:
   ```sql
   update public.profiles
   set role = 'admin', is_active = true
   where email = 'admin@yourdomain.com';
   ```

### 6. Run it
```bash
npm run dev
```
Open **http://localhost:3000** → sign in with the admin email.

> To receive a **6-digit code** (instead of a link) you must enable custom SMTP
> and edit the OTP email template — see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
> For local testing without SMTP, the email contains a magic **link** you can
> click to sign in.

---

## Deploying to production (Railway)

Full step-by-step is in **[DEPLOYMENT.md](DEPLOYMENT.md)**. In short:

1. Railway → **New Project → Deploy from GitHub** → select this repo.
2. Add the 3 environment variables (from `.env.example`) in Railway → **Variables**
   — **before the first build** (the `NEXT_PUBLIC_*` ones bake in at build time).
3. Run the SQL migrations on your Supabase project (step 4 above).
4. Configure Supabase Auth (Site URL + redirect URL) and the SMTP/OTP template.

Railway auto-detects Next.js and runs `npm run build` then `npm start`.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |

---

## Project structure

```
app/            Pages & routes (login, contacts, deals, settings, profile)
components/     UI components, grouped by feature (contacts, deals, ...)
lib/            Supabase clients + shared types
supabase/       SQL migrations (run these on your database)
DEPLOYMENT.md   Production / Railway setup checklist
```
