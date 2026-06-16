import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DealsReportsView,
  type RepDeal,
  type RepHistory,
} from "@/components/deals/deals-reports-view";
import type { ProfileOption } from "@/lib/types";

export const metadata = { title: "Deal reports · StrategistHub CRM" };

export default async function DealsReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin guard — SDRs bounce to their dashboard.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const [{ data: deals }, { data: history }, { data: owners }] =
    await Promise.all([
      supabase
        .from("deals")
        .select("id, deal_stage, value, owner_id, source, created_at"),
      supabase
        .from("deal_stage_history")
        .select("id, deal_id, to_stage, changed_at"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  return (
    <DealsReportsView
      deals={(deals as RepDeal[]) ?? []}
      history={(history as RepHistory[]) ?? []}
      owners={(owners as ProfileOption[]) ?? []}
    />
  );
}
