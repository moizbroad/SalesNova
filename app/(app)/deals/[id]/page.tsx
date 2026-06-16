import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_STAGE_STYLES,
  formatMoney,
  type ContactOption,
  type Deal,
  type DealNote,
  type ProfileOption,
} from "@/lib/types";
import {
  DealStageTimeline,
  type DealStageHistoryRow,
} from "@/components/deals/deal-stage-timeline";
import { EditDealForm } from "@/components/deals/edit-deal-form";
import { DealNotes } from "@/components/deals/deal-notes";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: deal } = await supabase
    .from("deals")
    .select(
      "*, owner:owner_id(full_name, email), contact:contact_id(id, name, company)",
    )
    .eq("id", id)
    .single();

  if (!deal) notFound();
  const d = deal as unknown as Deal;

  const [{ data: history }, { data: notes }, { data: owners }, { data: contacts }] =
    await Promise.all([
      supabase
        .from("deal_stage_history")
        .select("id, to_stage, changed_at")
        .eq("deal_id", id)
        .order("changed_at", { ascending: true }),
      supabase
        .from("deal_notes")
        .select("id, body, created_at, author:created_by(full_name, email)")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("contacts").select("id, name, company").order("name"),
    ]);

  const ownerName = d.owner?.full_name || d.owner?.email || "Unassigned";

  return (
    <div className="space-y-6">
      <Link href="/deals" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to deals
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{d.name}</h1>
            {d.contact && (
              <Link
                href={`/contacts/${d.contact.id}`}
                className="text-sm text-brand hover:underline"
              >
                {d.contact.company || d.contact.name} ↗
              </Link>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${DEAL_STAGE_STYLES[d.deal_stage].badge}`}
          >
            {d.deal_stage}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Value
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {formatMoney(d.value, d.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Probability
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {d.probability != null ? `${d.probability}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Expected close
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {d.expected_close_date ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Owner
            </dt>
            <dd className="mt-0.5 text-gray-900">{ownerName}</dd>
          </div>
        </dl>
      </div>

      {/* Stage timeline */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Stage timeline
        </h2>
        <DealStageTimeline
          history={(history as DealStageHistoryRow[]) ?? []}
        />
      </div>

      {/* Edit details */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Edit details
        </h2>
        <EditDealForm
          deal={d}
          owners={(owners as ProfileOption[]) ?? []}
          contacts={(contacts as ContactOption[]) ?? []}
        />
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Notes</h2>
        <DealNotes dealId={id} notes={(notes as unknown as DealNote[]) ?? []} />
      </div>
    </div>
  );
}
