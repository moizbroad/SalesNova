// Shared domain types + constants for the CRM.
// Mirrors the enums defined in supabase/migrations/0001_initial_schema.sql.

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Engaged",
  "MQL",
  "SQL",
  "Qualified",
  "Disqualified",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STATUSES = ["Active", "On Hold", "Lost", "Converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "LinkedIn",
  "Email Outreach",
  "Referral",
  "Inbound",
  "Event",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// Tailwind classes per stage — used by the Kanban column headers and badges.
export const STAGE_STYLES: Record<LeadStage, { dot: string; badge: string }> = {
  New: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  Contacted: { dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700" },
  Engaged: { dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700" },
  MQL: { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700" },
  SQL: { dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700" },
  Qualified: { dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  Disqualified: { dot: "bg-red-400", badge: "bg-red-100 text-red-700" },
};

// --- Deals module (mirrors supabase/migrations/0004_deals.sql) ---

export const DEAL_STAGES = [
  "Discovery",
  "Proposal Sent",
  "Negotiation",
  "Verbal Yes",
  "Closed Won",
  "Closed Lost",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

// Stages that count as closed (excluded from open-pipeline reporting).
export const CLOSED_DEAL_STAGES = ["Closed Won", "Closed Lost"] as const;

// Tailwind classes per deal stage — used by the deals Kanban + badges.
export const DEAL_STAGE_STYLES: Record<DealStage, { dot: string; badge: string }> = {
  Discovery: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  "Proposal Sent": { dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700" },
  Negotiation: { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700" },
  "Verbal Yes": { dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700" },
  "Closed Won": { dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  "Closed Lost": { dot: "bg-red-400", badge: "bg-red-100 text-red-700" },
};

export type Owner = {
  full_name: string | null;
  email: string | null;
};

// Linked contact embedded on a deal (via `contact:contact_id(...)`).
export type DealContact = {
  id: string;
  name: string;
  company: string | null;
};

export type Deal = {
  id: string;
  contact_id: string | null;
  name: string;
  deal_stage: DealStage;
  value: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  source: LeadSource | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner: Owner | null;
  contact: DealContact | null;
};

// Minimal contact shape for the "New deal" contact picker.
export type ContactOption = {
  id: string;
  name: string;
  company: string | null;
};

// Deal notes feed (deal detail page) — author embedded via created_by FK.
export type DealNote = {
  id: string;
  body: string;
  created_at: string;
  author: Author | null;
};

// Format a deal's value with its currency (compact, no decimals).
export function formatMoney(
  value: number | null,
  currency = "USD",
): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  lead_source: LeadSource | null;
  lead_stage: LeadStage;
  lead_status: LeadStatus;
  owner_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
  // Embedded via `owner:owner_id(...)` in the contacts query.
  owner: Owner | null;
};

export type ProfileOption = {
  id: string;
  full_name: string | null;
  email: string;
};

// Activity feed items (contact detail page) — author embedded via created_by FK.
export type Author = { full_name: string | null; email: string | null };

export type Note = {
  id: string;
  body: string;
  created_at: string;
  author: Author | null;
};

export type Conversation = {
  id: string;
  channel: "LinkedIn" | "Email";
  content: string | null;
  occurred_at: string | null;
  created_at: string;
  author: Author | null;
};

export type Meeting = {
  id: string;
  title: string | null;
  notes: string | null;
  meeting_date: string | null;
  created_at: string;
  author: Author | null;
};
