import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STAGE_STYLES,
  type Contact,
  type ProfileOption,
  type Note,
  type Conversation,
  type Meeting,
} from "@/lib/types";
import {
  StageTimeline,
  type StageHistoryRow,
} from "@/components/contacts/stage-timeline";
import { EditContactForm } from "@/components/contacts/edit-contact-form";
import { ActivityTabs } from "@/components/contacts/activity-tabs";
import { ConvertButton } from "@/components/contacts/convert-button";
import { CLOSED_DEAL_STAGES } from "@/lib/types";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*, owner:owner_id(full_name, email)")
    .eq("id", id)
    .single();

  if (!contact) notFound();
  const c = contact as Contact;

  // Is the viewer an admin? Only admins see the deal-conversion controls.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = me?.role === "admin";

  // Existing open deal for this contact (admins only — RLS returns nothing for
  // SDRs). Drives "View deal →" vs "Convert to Opportunity".
  const { data: openDeal } = isAdmin
    ? await supabase
        .from("deals")
        .select("id")
        .eq("contact_id", id)
        .not(
          "deal_stage",
          "in",
          `(${CLOSED_DEAL_STAGES.map((s) => `"${s}"`).join(",")})`,
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const [
    { data: history },
    { data: owners },
    { data: notes },
    { data: conversations },
    { data: meetings },
  ] = await Promise.all([
    supabase
      .from("stage_history")
      .select("id, to_stage, changed_at")
      .eq("contact_id", id)
      .order("changed_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("notes")
      .select("id, body, created_at, author:created_by(full_name, email)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select(
        "id, channel, content, occurred_at, created_at, author:created_by(full_name, email)",
      )
      .eq("contact_id", id)
      .order("occurred_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("meetings")
      .select(
        "id, title, notes, meeting_date, created_at, author:created_by(full_name, email)",
      )
      .eq("contact_id", id)
      .order("meeting_date", { ascending: false, nullsFirst: false }),
  ]);

  const ownerName = c.owner?.full_name || c.owner?.email || "Unassigned";

  return (
    <div className="space-y-6">
      <Link
        href="/contacts"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back to contacts
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
            {c.company && (
              <p className="text-sm text-gray-500">{c.company}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${STAGE_STYLES[c.lead_stage].badge}`}
            >
              {c.lead_stage}
            </span>
            {isAdmin &&
              (openDeal ? (
                <Link
                  href={`/deals/${openDeal.id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  View deal →
                </Link>
              ) : (
                <ConvertButton contactId={c.id} />
              ))}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Status
            </dt>
            <dd className="mt-0.5 text-gray-900">{c.lead_status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Source
            </dt>
            <dd className="mt-0.5 text-gray-900">{c.lead_source ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Owner
            </dt>
            <dd className="mt-0.5 text-gray-900">{ownerName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Next action
            </dt>
            <dd className="mt-0.5 text-gray-900">{c.next_action ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Stage timeline */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Stage timeline
        </h2>
        <StageTimeline history={(history as StageHistoryRow[]) ?? []} />
      </div>

      {/* Edit details */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Edit details
        </h2>
        <EditContactForm
          contact={c}
          owners={(owners as ProfileOption[]) ?? []}
        />
      </div>

      {/* Activity */}
      <ActivityTabs
        contactId={id}
        notes={(notes as unknown as Note[]) ?? []}
        conversations={(conversations as unknown as Conversation[]) ?? []}
        meetings={(meetings as unknown as Meeting[]) ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
