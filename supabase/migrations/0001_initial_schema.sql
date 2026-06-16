-- ============================================================================
-- StrategistHub CRM — Task 1: initial schema, triggers, and RLS
-- Run this once in the Supabase SQL editor (SQL Editor → New query → paste → Run).
-- Safe to re-run: enums are guarded, tables use IF NOT EXISTS, policies/triggers
-- are dropped before recreate.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'sdr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_stage as enum
    ('New', 'Contacted', 'Engaged', 'MQL', 'SQL', 'Qualified', 'Disqualified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_status as enum
    ('Active', 'On Hold', 'Lost', 'Converted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_source as enum
    ('LinkedIn', 'Email Outreach', 'Referral', 'Inbound', 'Event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.conversation_channel as enum ('LinkedIn', 'Email');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------------

-- profiles — one row per user. id matches auth.users.id.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  full_name  text,
  role       public.user_role not null default 'sdr',
  avatar_url text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- settings — single-row table (id is always 1) for company branding.
create table if not exists public.settings (
  id           int primary key default 1 check (id = 1),
  company_name text not null default 'StrategistHub',
  logo_url     text,
  updated_at   timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- contacts — the center of the CRM.
create table if not exists public.contacts (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  company          text,
  email            text,
  phone            text,
  linkedin_url     text,
  lead_source      public.lead_source,
  lead_stage       public.lead_stage  not null default 'New',
  lead_status      public.lead_status not null default 'Active',
  owner_id         uuid references public.profiles(id) on delete set null,
  next_action      text,
  next_action_date date,
  created_by       uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- stage_history — auto-filled by triggers. Powers all stage reporting.
create table if not exists public.stage_history (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  from_stage public.lead_stage,
  to_stage   public.lead_stage not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- notes
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  body       text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- conversations
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  channel     public.conversation_channel not null,
  content     text,
  occurred_at timestamptz,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- meetings — notes column holds rich-text HTML (Task 7).
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  title        text,
  notes        text,
  meeting_date timestamptz,
  created_by   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. INDEXES (fast lookups by contact + stage reporting)
-- ---------------------------------------------------------------------------
create index if not exists idx_stage_history_contact   on public.stage_history(contact_id);
create index if not exists idx_stage_history_to_stage  on public.stage_history(to_stage, changed_at);
create index if not exists idx_notes_contact           on public.notes(contact_id);
create index if not exists idx_conversations_contact   on public.conversations(contact_id);
create index if not exists idx_meetings_contact        on public.meetings(contact_id);
create index if not exists idx_contacts_stage          on public.contacts(lead_stage);
create index if not exists idx_contacts_owner          on public.contacts(owner_id);

-- ---------------------------------------------------------------------------
-- 4. FUNCTIONS
-- ---------------------------------------------------------------------------

-- is_admin() — SECURITY DEFINER so it can read profiles without tripping RLS
-- (avoids infinite recursion when used inside profiles policies).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- handle_new_user() — when an auth user is created, ensure a matching profile.
-- Idempotent: if admin pre-created the profile, do nothing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- record_stage_change() — on UPDATE, log a history row when the stage moves.
create or replace function public.record_stage_change()
returns trigger
language plpgsql
as $$
begin
  if new.lead_stage is distinct from old.lead_stage then
    insert into public.stage_history (contact_id, from_stage, to_stage, changed_by)
    values (new.id, old.lead_stage, new.lead_stage, auth.uid());
  end if;
  return new;
end;
$$;

-- record_initial_stage() — on INSERT, log the contact's starting stage.
create or replace function public.record_initial_stage()
returns trigger
language plpgsql
as $$
begin
  insert into public.stage_history (contact_id, from_stage, to_stage, changed_by)
  values (new.id, null, new.lead_stage, coalesce(auth.uid(), new.created_by));
  return new;
end;
$$;

-- set_updated_at() — keep contacts.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_record_initial_stage on public.contacts;
create trigger trg_record_initial_stage
  after insert on public.contacts
  for each row execute function public.record_initial_stage();

drop trigger if exists trg_record_stage_change on public.contacts;
create trigger trg_record_stage_change
  after update on public.contacts
  for each row execute function public.record_stage_change();

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.settings      enable row level security;
alter table public.contacts      enable row level security;
alter table public.stage_history enable row level security;
alter table public.notes         enable row level security;
alter table public.conversations enable row level security;
alter table public.meetings      enable row level security;

-- profiles: everyone signed in reads; users update their own row; admins update any.
drop policy if exists profiles_select       on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own   on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated with check (public.is_admin());

-- settings: signed-in read; admin update.
drop policy if exists settings_select       on public.settings;
create policy settings_select on public.settings
  for select to authenticated using (true);

drop policy if exists settings_update_admin on public.settings;
create policy settings_update_admin on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- contacts + activity tables: signed-in users have full read/write (MVP).
drop policy if exists contacts_all on public.contacts;
create policy contacts_all on public.contacts
  for all to authenticated using (true) with check (true);

drop policy if exists stage_history_all on public.stage_history;
create policy stage_history_all on public.stage_history
  for all to authenticated using (true) with check (true);

drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
  for all to authenticated using (true) with check (true);

drop policy if exists conversations_all on public.conversations;
create policy conversations_all on public.conversations
  for all to authenticated using (true) with check (true);

drop policy if exists meetings_all on public.meetings;
create policy meetings_all on public.meetings
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- Done. Smoke test: insert a contact, then UPDATE its lead_stage — a
-- stage_history row should appear automatically for each change.
-- ============================================================================
