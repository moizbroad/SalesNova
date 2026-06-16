"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadStage,
} from "@/lib/types";

export type CreateContactState = { error?: string; ok?: boolean };

// Create a contact. Stage defaults to "New"; the DB trigger writes the
// initial stage_history row automatically.
export async function createContact(
  _prev: CreateContactState,
  formData: FormData,
): Promise<CreateContactState> {
  const supabase = await createClient();

  // Server Actions are reachable by direct POST — always re-check auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const get = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  const source = get("lead_source");
  const stage = get("lead_stage");
  const ownerId = get("owner_id");

  const { error } = await supabase.from("contacts").insert({
    name,
    company: get("company"),
    email: get("email"),
    phone: get("phone"),
    linkedin_url: get("linkedin_url"),
    lead_source:
      source && LEAD_SOURCES.includes(source as never) ? source : null,
    lead_stage:
      stage && LEAD_STAGES.includes(stage as never) ? (stage as LeadStage) : "New",
    owner_id: ownerId ?? user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return { ok: true };
}

export type UpdateContactInput = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  lead_source: string | null;
  lead_stage: string;
  lead_status: string;
  owner_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
};

// Update all fields of a contact (detail-page edit form). Changing lead_stage
// fires the DB trigger that logs the transition to stage_history.
export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  if (!LEAD_STAGES.includes(input.lead_stage as LeadStage))
    return { error: "Invalid stage." };
  if (!LEAD_STATUSES.includes(input.lead_status as never))
    return { error: "Invalid status." };

  const { error } = await supabase
    .from("contacts")
    .update({
      name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      linkedin_url: input.linkedin_url,
      lead_source:
        input.lead_source && LEAD_SOURCES.includes(input.lead_source as never)
          ? input.lead_source
          : null,
      lead_stage: input.lead_stage,
      lead_status: input.lead_status,
      owner_id: input.owner_id,
      next_action: input.next_action,
      next_action_date: input.next_action_date,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  return { ok: true };
}

// Move a contact to a new stage (Kanban drag-and-drop). Updating lead_stage
// fires the DB trigger that logs the change to stage_history.
export async function updateContactStage(id: string, stage: LeadStage) {
  if (!LEAD_STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("contacts")
    .update({ lead_stage: stage })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return { ok: true };
}
