import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealsView } from "@/components/deals/deals-view";
import type { ContactOption, Deal, ProfileOption } from "@/lib/types";

export const metadata = { title: "Deals · StrategistHub CRM" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = view === "table" ? "table" : "kanban";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin guard — SDRs bounce back to their dashboard. RLS also blocks the
  // queries below, but redirecting keeps them out of the route entirely.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const [{ data: deals }, { data: owners }, { data: contacts }] =
    await Promise.all([
      supabase
        .from("deals")
        .select(
          "*, owner:owner_id(full_name, email), contact:contact_id(id, name, company)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("contacts")
        .select("id, name, company")
        .order("name"),
    ]);

  return (
    <DealsView
      deals={(deals as unknown as Deal[]) ?? []}
      owners={(owners as ProfileOption[]) ?? []}
      contacts={(contacts as ContactOption[]) ?? []}
      initialView={initialView}
      currentUserId={user!.id}
    />
  );
}
