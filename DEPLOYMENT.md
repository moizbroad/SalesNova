# Deployment — connecting to a new Supabase project

The **app code is ready** for everything below (incl. the 6-digit sign-in code).
What follows is the **per-project setup** that lives inside Supabase + your host —
it does **not** travel with the code, so it has to be done once on the target
project.

> TL;DR for the 6-digit login: **(1)** point the app at the DB, **(2)** run the
> SQL migrations, **(3)** enable custom SMTP, **(4)** edit the OTP template to add
> `{{ .Token }}`, **(5)** seed an admin user. Skip step 4 and users get a *link*,
> not a code.

---

## 1. Point the app at the Supabase project (env vars)

Set these in your host (Vercel/Netlify/etc.) or `.env.local` for local runs:

| Variable | Where to find it (Supabase → Project Settings → API) |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **server-only, never expose** (used to add/manage users) |

Swapping these is what makes the app use the new database.

---

## 2. Run the SQL migrations (creates all tables, RLS, triggers)

In Supabase → **SQL Editor → New query**, paste and run **in order**:

1. `supabase/migrations/0001_initial_schema.sql` — profiles, contacts, stage history, RLS, triggers
2. `supabase/migrations/0002_avatars_storage.sql` — avatar storage bucket
3. `supabase/migrations/0003_branding_storage.sql` — logo storage bucket
4. `supabase/migrations/0004_deals.sql` — deals, deal_stage_history, deal_notes (admin-only RLS) + triggers

Each is safe to re-run. Without these the app has no tables and will error.

---

## 3. Enable custom SMTP (required for the 6-digit code)

Supabase's built-in email is rate-limited and for testing only. To send real
emails — **and to be able to edit the OTP template** — enable custom SMTP.

Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**, then
fill in a provider. Quickest free option is **Resend**:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | an address on a **domain you verified in Resend** (e.g. `noreply@yourdomain.com`) |
| Sender name | e.g. `StrategistHub CRM` |

> ⚠️ If you turn the toggle ON but leave fields blank/invalid, **no auth emails
> send at all**. Either fill it fully, or leave it OFF (link-only fallback).

---

## 4. Edit the OTP template to show the 6-digit code

This is the step that actually produces a code. It's locked until step 3 is done.

Supabase → **Authentication → Emails → Templates → "Magic link or OTP"** → set the
message body to include the token (and keep the link as a fallback):

```html
<h2>Your sign-in code</h2>
<p>Enter this code to sign in. It expires shortly.</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:3px">{{ .Token }}</p>
<p>Or sign in here: <a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

- `{{ .Token }}` → the 6-digit code (primary).
- `{{ .ConfirmationURL }}` → magic link (fallback; handled by `/auth/callback`).

Skip this and users receive the **default link only** — no code.

---

## 5. Auth URL configuration

Supabase → **Authentication → URL Configuration**:

- **Site URL** = the deployed app URL (e.g. `https://crm.yourdomain.com`)
- **Redirect URLs** = add `https://crm.yourdomain.com/auth/callback`
  (and `http://localhost:3000/auth/callback` for local dev)

This is what makes the fallback magic link land back in the app.

---

## 6. Seed the first admin user

Sign-up is closed (`shouldCreateUser: false`), so the first admin must be created
by hand:

1. Supabase → **Authentication → Users → Add user** → enter the admin's email
   (auto-confirm it). A `profiles` row is created automatically by a trigger,
   defaulting to `role = 'sdr'`.
2. Promote them to admin — Supabase → **SQL Editor**:
   ```sql
   update public.profiles
   set role = 'admin', is_active = true
   where email = 'admin@yourdomain.com';
   ```

After that, this admin can add the rest of the team from **Settings → Users**
inside the app.

---

## 7. Verify

1. Visit the app → **Log out** if needed → enter the admin email → **Send sign-in code**.
2. The email arrives with a **6-digit code** (+ a backup link).
3. Enter the code → you're in.
4. Admin sees **Deals** in the sidebar; SDRs do not.

That's the full chain. The app side is fixed; everything above is project config.
