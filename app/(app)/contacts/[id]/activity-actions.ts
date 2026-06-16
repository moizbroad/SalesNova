"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActivityResult = { error?: string; ok?: boolean };

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addNote(
  contactId: string,
  body: string,
): Promise<ActivityResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not signed in." };
  const text = body.trim();
  if (!text) return { error: "Note is empty." };

  const { error } = await supabase
    .from("notes")
    .insert({ contact_id: contactId, body: text, created_by: user.id });
  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}

// Edit an existing note. Admin-only: the notes table's RLS allows any
// authenticated user, so we gate editing here (server actions are reachable by
// direct POST, so we re-check the role even though the UI hides the button).
export async function updateNote(
  noteId: string,
  contactId: string,
  body: string,
): Promise<ActivityResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: "Admins only." };

  const text = body.trim();
  if (!text) return { error: "Note is empty." };

  const { error } = await supabase
    .from("notes")
    .update({ body: text })
    .eq("id", noteId);
  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}

export async function addConversation(
  contactId: string,
  input: { channel: string; content: string; occurred_at: string | null },
): Promise<ActivityResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not signed in." };
  if (!["LinkedIn", "Email"].includes(input.channel))
    return { error: "Pick a channel." };
  const content = input.content.trim();
  if (!content) return { error: "Conversation is empty." };

  const { error } = await supabase.from("conversations").insert({
    contact_id: contactId,
    channel: input.channel,
    content,
    occurred_at: input.occurred_at,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}

export async function addMeeting(
  contactId: string,
  input: { title: string; meeting_date: string | null; notes: string },
): Promise<ActivityResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not signed in." };
  const title = input.title.trim();
  if (!title) return { error: "Meeting title is required." };

  // Strip an empty editor (Tiptap emits "<p></p>" when blank).
  const notes =
    input.notes.replace(/<p>\s*<\/p>/g, "").trim() === "" ? null : input.notes;

  const { error } = await supabase.from("meetings").insert({
    contact_id: contactId,
    title,
    meeting_date: input.meeting_date,
    notes,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}
