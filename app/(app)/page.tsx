import { createClient } from "@/lib/supabase/server";
import {
  DashboardView,
  type DashContact,
  type DashHistory,
} from "@/components/dashboard/dashboard-view";
import type { ProfileOption } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: history }, { data: owners }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select(
          "id, lead_stage, lead_status, lead_source, owner_id, created_at",
        ),
      supabase.from("stage_history").select("id, contact_id, to_stage, changed_at"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  return (
    <DashboardView
      contacts={(contacts as DashContact[]) ?? []}
      history={(history as DashHistory[]) ?? []}
      owners={(owners as ProfileOption[]) ?? []}
    />
  );
}
