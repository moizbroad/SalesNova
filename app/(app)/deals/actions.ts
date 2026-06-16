"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  DEAL_STAGES,
  LEAD_SOURCES,
  type DealStage,
} from "@/lib/types";

// Shared admin guard for every deal action. Server actions are reachable by
// direct POST, so each one re-checks auth + role even when the UI is hidden.
async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: "Admins only." };
  return {};
}

// Convert a contact into a deal (the contact → opportunity bridge).
//
// Admin-only: the deal module is gated at the DB (RLS), the route, and here.
// Server actions are reachable by direct POST, so we re-check auth + role even
// though the button is hidden for SDRs.
//
// Duplicate guard: if the contact already has a deal that isn't Closed
// Won/Lost, we reuse it instead of creating a second one.
//
// Returns { error } on failure; on success it redirects to the deal and never
// returns (redirect throws, so it sits outside any try/catch).
export async function convertContactToDeal(
  contactId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  // Load the contact we're converting.
  const { data: contact, error: contactErr } = await supabase
    .from("contacts")
    .select("id, name, company, lead_source, owner_id")
    .eq("id", contactId)
    .single();
  if (contactErr || !contact) return { error: "Contact not found." };

  // Duplicate guard — reuse any existing open deal for this contact.
  const { data: existing } = await supabase
    .from("deals")
    .select("id")
    .eq("contact_id", contactId)
    .not("deal_stage", "in", `(${CLOSED_DEAL_STAGES.map((s) => `"${s}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let dealId = existing?.id as string | undefined;

  if (!dealId) {
    const dealName = `${contact.company || contact.name} — Deal`;
    const { data: created, error: createErr } = await supabase
      .from("deals")
      .insert({
        contact_id: contact.id,
        name: dealName,
        deal_stage: "Discovery",
        source: contact.lead_source,
        owner_id: contact.owner_id,
      })
      .select("id")
      .single();

    if (createErr || !created) {
      return { error: createErr?.message ?? "Could not create the deal." };
    }
    dealId = created.id;

    // Mark the contact as converted (only on a fresh conversion).
    await supabase
      .from("contacts")
      .update({ lead_status: "Converted" })
      .eq("id", contact.id);
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  revalidatePath("/deals");

  redirect(`/deals/${dealId}`);
}

export type CreateDealState = { error?: string; ok?: boolean };

// Create a deal manually (the "New deal" form on /deals). Stage defaults to
// Discovery; the DB trigger writes the initial deal_stage_history row.
export async function createDeal(
  _prev: CreateDealState,
  formData: FormData,
): Promise<CreateDealState> {
  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const get = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  const source = get("source");
  const stage = get("deal_stage");
  const valueRaw = get("value");
  const probRaw = get("probability");
  const currency = get("currency");

  const { error } = await supabase.from("deals").insert({
    name,
    contact_id: get("contact_id"),
    deal_stage:
      stage && DEAL_STAGES.includes(stage as DealStage)
        ? (stage as DealStage)
        : "Discovery",
    value: valueRaw != null ? Number(valueRaw) : null,
    currency: currency ?? "USD",
    probability: probRaw != null ? Number(probRaw) : null,
    expected_close_date: get("expected_close_date"),
    source: source && LEAD_SOURCES.includes(source as never) ? source : null,
    owner_id: get("owner_id"),
  });

  if (error) return { error: error.message };

  revalidatePath("/deals");
  return { ok: true };
}

export type UpdateDealInput = {
  name: string;
  contact_id: string | null;
  deal_stage: string;
  value: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  source: string | null;
  owner_id: string | null;
};

// Update all fields of a deal (detail-page edit form). Changing deal_stage
// fires the DB trigger that logs the transition to deal_stage_history.
export async function updateDeal(
  id: string,
  input: UpdateDealInput,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!DEAL_STAGES.includes(input.deal_stage as DealStage))
    return { error: "Invalid stage." };

  const { error } = await supabase
    .from("deals")
    .update({
      name,
      contact_id: input.contact_id,
      deal_stage: input.deal_stage,
      value: input.value,
      currency: input.currency || "USD",
      probability: input.probability,
      expected_close_date: input.expected_close_date,
      source:
        input.source && LEAD_SOURCES.includes(input.source as never)
          ? input.source
          : null,
      owner_id: input.owner_id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  return { ok: true };
}

// Add a note to a deal (admin-only deal_notes feed).
export async function addDealNote(
  dealId: string,
  body: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  const text = body.trim();
  if (!text) return { error: "Note is empty." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("deal_notes")
    .insert({ deal_id: dealId, body: text, created_by: user!.id });

  if (error) return { error: error.message };

  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

// Edit an existing deal note. Admin-only (the whole deal module is).
export async function updateDealNote(
  noteId: string,
  dealId: string,
  body: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  const text = body.trim();
  if (!text) return { error: "Note is empty." };

  const { error } = await supabase
    .from("deal_notes")
    .update({ body: text })
    .eq("id", noteId);

  if (error) return { error: error.message };

  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

// Move a deal to a new stage (Kanban drag-and-drop). Updating deal_stage fires
// the DB trigger that logs the transition to deal_stage_history.
export async function updateDealStage(
  id: string,
  stage: DealStage,
): Promise<{ error?: string; ok?: boolean }> {
  if (!DEAL_STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();

  const guard = await requireAdmin(supabase);
  if (guard.error) return guard;

  const { error } = await supabase
    .from("deals")
    .update({ deal_stage: stage })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/deals");
  return { ok: true };
}
