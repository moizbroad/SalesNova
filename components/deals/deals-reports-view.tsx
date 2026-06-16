"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  DEAL_STAGES,
  CLOSED_DEAL_STAGES,
  LEAD_SOURCES,
  formatMoney,
  type ProfileOption,
} from "@/lib/types";

export type RepDeal = {
  id: string;
  deal_stage: string;
  value: number | null;
  owner_id: string | null;
  source: string | null;
  created_at: string;
};
export type RepHistory = {
  id: string;
  deal_id: string;
  to_stage: string;
  changed_at: string;
};

const STAGE_HEX: Record<string, string> = {
  Discovery: "#94a3b8",
  "Proposal Sent": "#60a5fa",
  Negotiation: "#fbbf24",
  "Verbal Yes": "#818cf8",
  "Closed Won": "#22c55e",
  "Closed Lost": "#f87171",
};

// Open stages = pipeline (everything not closed won/lost).
const OPEN_STAGES = DEAL_STAGES.filter(
  (s) => !CLOSED_DEAL_STAGES.includes(s as never),
);

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
function compactMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
  }).format(n);
}

function KpiCard({
  label,
  value,
  sub,
  primary = false,
}: {
  label: string;
  value: string;
  sub?: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <div className="rounded-xl bg-linear-to-br from-brand to-brand-dark p-5 text-white shadow-md transition-transform hover:-translate-y-0.5">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/80">
          {label}
        </div>
        {sub && <div className="mt-1 text-xs text-white/70">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 border-t-2 border-t-brand bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function ChartCard({
  title,
  data,
  money = false,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  money?: boolean;
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{title}</h2>
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={money ? (v: number) => compactMoney(v) : undefined}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              formatter={
                money
                  ? (v) => [formatMoney(Number(v)), "Value"]
                  : undefined
              }
            />
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

export function DealsReportsView({
  deals,
  history,
  owners,
}: {
  deals: RepDeal[];
  history: RepHistory[];
  owners: ProfileOption[];
}) {
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(isoToday());
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");

  const dealById = useMemo(() => {
    const m = new Map<string, RepDeal>();
    deals.forEach((d) => m.set(d.id, d));
    return m;
  }, [deals]);

  // Attribute filters (owner + source) — applied everywhere.
  const matches = useMemo(
    () => (d: RepDeal | undefined) => {
      if (!d) return false;
      if (source && (d.source ?? "") !== source) return false;
      if (owner)
        if (owner === "unassigned" ? d.owner_id !== null : d.owner_id !== owner)
          return false;
      return true;
    },
    [source, owner],
  );

  const inRange = (iso: string) => {
    const day = iso.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  };

  const filteredDeals = useMemo(
    () => deals.filter((d) => matches(d)),
    [deals, matches],
  );

  // --- Open pipeline (current snapshot, not date-bound) ---
  const openDeals = filteredDeals.filter(
    (d) => !CLOSED_DEAL_STAGES.includes(d.deal_stage as never),
  );

  const pipelineByStage = OPEN_STAGES.map((s) => ({
    name: s,
    value: openDeals
      .filter((d) => d.deal_stage === s)
      .reduce((sum, d) => sum + (d.value ?? 0), 0),
    color: STAGE_HEX[s],
  }));

  const countByStage = OPEN_STAGES.map((s) => ({
    name: s,
    value: openDeals.filter((d) => d.deal_stage === s).length,
    color: STAGE_HEX[s],
  }));

  const openPipelineValue = openDeals.reduce(
    (sum, d) => sum + (d.value ?? 0),
    0,
  );

  // --- Won / Lost in range (from deal_stage_history) ---
  const wonLost = useMemo(() => {
    let wonCount = 0,
      lostCount = 0,
      wonValue = 0,
      lostValue = 0,
      openedCount = 0,
      proposalCount = 0,
      proposalValue = 0;
    history.forEach((h) => {
      if (!inRange(h.changed_at)) return;
      const d = dealById.get(h.deal_id);
      if (!matches(d)) return;
      if (h.to_stage === "Closed Won") {
        wonCount++;
        wonValue += d!.value ?? 0;
      } else if (h.to_stage === "Closed Lost") {
        lostCount++;
        lostValue += d!.value ?? 0;
      } else if (h.to_stage === "Discovery") {
        openedCount++;
      } else if (h.to_stage === "Proposal Sent") {
        proposalCount++;
        proposalValue += d!.value ?? 0;
      }
    });
    return {
      wonCount,
      lostCount,
      wonValue,
      lostValue,
      openedCount,
      proposalCount,
      proposalValue,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, dealById, matches, from, to]);

  const decided = wonLost.wonCount + wonLost.lostCount;
  const winRate = decided ? Math.round((wonLost.wonCount / decided) * 100) : 0;

  const withValue = filteredDeals.filter((d) => d.value != null);
  const avgValue = withValue.length
    ? withValue.reduce((sum, d) => sum + (d.value ?? 0), 0) / withValue.length
    : 0;

  const wonLostChart = [
    { name: "Won", value: wonLost.wonValue, color: "#22c55e" },
    { name: "Lost", value: wonLost.lostValue, color: "#f87171" },
  ];

  function clearFilters() {
    setFrom(isoDaysAgo(90));
    setTo(isoToday());
    setSource("");
    setOwner("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deal reports</h1>
          <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-3 text-sm text-gray-500">
            Pipeline & win/loss. Date range affects won/lost and deals-opened
            metrics; pipeline is a live snapshot.
          </p>
        </div>
        <Link
          href="/deals"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to deals
        </Link>
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
        <button
          onClick={clearFilters}
          className="rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          Reset
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Open pipeline value"
          value={formatMoney(openPipelineValue)}
          sub={`${openDeals.length} open deals`}
          primary
        />
        <KpiCard
          label="Win rate (in range)"
          value={`${winRate}%`}
          sub={`${wonLost.wonCount} won / ${wonLost.lostCount} lost`}
        />
        <KpiCard
          label="Won (in range)"
          value={String(wonLost.wonCount)}
          sub={formatMoney(wonLost.wonValue)}
        />
        <KpiCard
          label="Lost (in range)"
          value={String(wonLost.lostCount)}
          sub={formatMoney(wonLost.lostValue)}
        />
        <KpiCard
          label="Deals opened (in range)"
          value={String(wonLost.openedCount)}
        />
        <KpiCard
          label="Proposal sent (in range)"
          value={String(wonLost.proposalCount)}
          sub={formatMoney(wonLost.proposalValue)}
        />
        <KpiCard
          label="Average deal value"
          value={formatMoney(avgValue)}
          sub={`${withValue.length} deals with a value`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Open pipeline value by stage"
          data={pipelineByStage}
          money
        />
        <ChartCard title="Open deal count by stage" data={countByStage} />
        <ChartCard title="Won vs Lost value (in range)" data={wonLostChart} money />
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Totals</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total deals (filtered)</dt>
              <dd className="font-semibold">{filteredDeals.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Open deals</dt>
              <dd className="font-semibold">{openDeals.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Won value (in range)</dt>
              <dd className="font-semibold">{formatMoney(wonLost.wonValue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Lost value (in range)</dt>
              <dd className="font-semibold">{formatMoney(wonLost.lostValue)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
