"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { error?: string; ok?: boolean };

const ROLES = ["admin", "sdr"] as const;
type Role = (typeof ROLES)[number];

// Confirm the caller is a signed-in admin. Returns their user id, or an error.
async function requireAdmin(): Promise<
  { userId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admins only." };
  return { userId: user.id };
}

// Add a user: create the auth account (so magic-link login works) + set their
// name and role. The handle_new_user trigger creates the profile row.
export async function addUser(input: {
  email: string;
  full_name: string;
  role: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();
  const role: Role = input.role === "admin" ? "admin" : "sdr";

  if (!email) return { error: "Email is required." };
  if (!full_name) return { error: "Name is required." };

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) return { error: error.message };

  // Upsert (not update) so the profile is correct whether or not the
  // handle_new_user trigger already created it.
  const { error: upErr } = await admin
    .from("profiles")
    .upsert(
      { id: data.user.id, email, full_name, role, is_active: true },
      { onConflict: "id" },
    );
  if (upErr) return { error: upErr.message };

  revalidatePath("/settings");
  return { ok: true };
}

// Enable/disable a user (disabled users are blocked at login).
export async function setUserActive(
  id: string,
  is_active: boolean,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;
  if (id === guard.userId) return { error: "You can't disable yourself." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

// Change a user's role.
export async function setUserRole(
  id: string,
  role: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;
  if (id === guard.userId) return { error: "You can't change your own role." };
  if (!ROLES.includes(role as Role)) return { error: "Invalid role." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

// Save company name + logo. Logo is uploaded client-side; we store the URL.
export async function updateBranding(input: {
  company_name: string;
  logo_url: string | null;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  const company_name = input.company_name.trim();
  if (!company_name) return { error: "Company name is required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .update({
      company_name,
      logo_url: input.logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // refresh the logo in the app shell
  return { ok: true };
}
