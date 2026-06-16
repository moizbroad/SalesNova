"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileState = { error?: string; ok?: boolean };

// Update the signed-in user's own name + avatar. RLS only lets a user touch
// their own profiles row, so this is safe.
export async function updateProfile(input: {
  full_name: string;
  avatar_url: string | null;
}): Promise<UpdateProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const full_name = input.full_name.trim();
  if (!full_name) return { error: "Name is required." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, avatar_url: input.avatar_url })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout"); // refresh the sidebar name/avatar everywhere
  return { ok: true };
}
