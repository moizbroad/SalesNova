import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsersSection } from "@/components/settings/users-section";
import { BrandingSection } from "@/components/settings/branding-section";

export const metadata = { title: "Settings · StrategistHub CRM" };

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "sdr";
  is_active: boolean;
  created_at: string;
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin guard — SDRs bounce back to home.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const [{ data: profiles }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("settings")
      .select("company_name, logo_url")
      .eq("id", 1)
      .single(),
  ]);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
        <p className="mt-3 text-sm text-gray-500">Manage users and branding.</p>
      </div>

      <UsersSection
        currentUserId={user!.id}
        profiles={(profiles as ProfileRow[]) ?? []}
      />

      <BrandingSection
        companyName={settings?.company_name ?? "StrategistHub"}
        logoUrl={settings?.logo_url ?? null}
      />
    </div>
  );
}
