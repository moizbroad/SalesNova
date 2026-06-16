"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  LEAD_STAGES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  type ProfileOption,
} from "@/lib/types";

export type DashContact = {
  id: string;
  lead_stage: string;
  lead_status: string;
  lead_source: string | null;
  owner_id: string | null;
  created_at: string;
};
export type DashHistory = {
  id: string;
  contact_id: string;
  to_stage: string;
  changed_at: string;
};

const STAGE_HEX: Record<string, string> = {
  New: "#94a3b8",
  Contacted: "#60a5fa",
  Engaged: "#818cf8",
  MQL: "#fbbf24",
  SQL: "#fb923c",
  Qualified: "#22c55e",
  Disqualified: "#f87171",
};

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none";

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <div className="rounded-xl bg-linear-to-br from-brand to-brand-dark p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
        <div className="text-4xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/80">
          {label}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 border-t-2 border-t-brand bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-4xl font-bold tracking-tight text-gray-900">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{title}</h2>
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
          No data for these filters.
        </div>
      )}
    </div>
  );
}

export function DashboardView({
  contacts,
  history,
  owners,
}: {
  contacts: DashContact[];
  history: DashHistory[];
  owners: ProfileOption[];
}) {
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(isoToday());
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");

  const contactById = useMemo(() => {
    const m = new Map<string, DashContact>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  // Attribute filters (everything except the date range).
  const matches = useMemo(
    () => (c: DashContact | undefined) => {
      if (!c) return false;
      if (source && (c.lead_source ?? "") !== source) return false;
      if (owner)
        if (owner === "unassigned" ? c.owner_id !== null : c.owner_id !== owner)
          return false;
      if (status && c.lead_status !== status) return false;
      return true;
    },
    [source, owner, status],
  );

  const inRange = (iso: string) => {
    const day = iso.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  };

  const filteredContacts = useMemo(
    () => contacts.filter((c) => matches(c)),
    [contacts, matches],
  );

  // Current pipeline by stage
  const byStage = useMemo(
    () =>
      LEAD_STAGES.map((s) => ({
        name: s,
        value: filteredContacts.filter((c) => c.lead_stage === s).length,
        color: STAGE_HEX[s],
      })),
    [filteredContacts],
  );

  // Current contacts by source
  const bySource = useMemo(
    () =>
      LEAD_SOURCES.map((s) => ({
        name: s,
        value: filteredContacts.filter((c) => (c.lead_source ?? "") === s)
          .length,
        color: "#6366f1",
      })),
    [filteredContacts],
  );

  // Stage transitions within the date range (from stage_history)
  const transitions = useMemo(() => {
    const counts: Record<string, number> = {};
    LEAD_STAGES.forEach((s) => (counts[s] = 0));
    history.forEach((h) => {
      if (!inRange(h.changed_at)) return;
      if (!matches(contactById.get(h.contact_id))) return;
      counts[h.to_stage] = (counts[h.to_stage] ?? 0) + 1;
    });
    return LEAD_STAGES.map((s) => ({
      name: s,
      value: counts[s],
      color: STAGE_HEX[s],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, contactById, matches, from, to]);

  const movedTo = (stage: string) =>
    transitions.find((t) => t.name === stage)?.value ?? 0;

  const newInRange = filteredContacts.filter((c) =>
    inRange(c.created_at),
  ).length;

  function clearFilters() {
    setFrom(isoDaysAgo(90));
    setTo(isoToday());
    setSource("");
    setOwner("");
    setStatus("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
        <p className="mt-3 text-sm text-gray-500">
          Pipeline & activity. Date range affects “new” and “moved to” metrics.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white shadow-sm p-3">
        <label className="text-xs text-gray-500">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={selectClass}
        />
        <label className="text-xs text-gray-500">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={selectClass}
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={selectClass}
        >
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className={selectClass}
        >
          <option value="">All owners</option>
          <option value="unassigned">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.full_name || o.email}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={clearFilters}
          className="rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          Reset
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="New contacts (in range)" value={newInRange} primary />
        <KpiCard label="Moved to MQL" value={movedTo("MQL")} />
        <KpiCard label="Moved to SQL" value={movedTo("SQL")} />
        <KpiCard label="Moved to Qualified" value={movedTo("Qualified")} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Pipeline — contacts by stage" data={byStage} />
        <ChartCard
          title="Stage transitions in range"
          data={transitions}
        />
        <ChartCard title="Contacts by source" data={bySource} />
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Totals</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total contacts (filtered)</dt>
              <dd className="font-semibold">{filteredContacts.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Active</dt>
              <dd className="font-semibold">
                {filteredContacts.filter((c) => c.lead_status === "Active").length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Converted</dt>
              <dd className="font-semibold">
                {filteredContacts.filter((c) => c.lead_status === "Converted").length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Transitions logged (in range)</dt>
              <dd className="font-semibold">
                {transitions.reduce((a, t) => a + t.value, 0)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
