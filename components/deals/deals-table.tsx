"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEAL_STAGES,
  DEAL_STAGE_STYLES,
  LEAD_SOURCES,
  formatMoney,
  type Deal,
  type ProfileOption,
} from "@/lib/types";

type SortKey = "name" | "value" | "expected_close_date";
type SortDir = "asc" | "desc";

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none";

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <button
        onClick={() => onToggle(sortKey)}
        className="flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        <span className="text-gray-400">
          {sort.key === sortKey ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

export function DealsTable({
  deals,
  owners,
}: {
  deals: Deal[];
  owners: ProfileOption[];
}) {
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [closeFrom, setCloseFrom] = useState("");
  const [closeTo, setCloseTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "expected_close_date",
    dir: "asc",
  });

  const ownerName = (d: Deal) => d.owner?.full_name || d.owner?.email || "";

  const filtered = useMemo(() => {
    const rows = deals.filter((d) => {
      if (stage && d.deal_stage !== stage) return false;
      if (source && (d.source ?? "") !== source) return false;
      if (owner) {
        if (owner === "unassigned" ? d.owner_id !== null : d.owner_id !== owner)
          return false;
      }
      // Expected-close-date range (inclusive). Deals with no date drop out when
      // either bound is set.
      if (closeFrom) {
        if (!d.expected_close_date || d.expected_close_date < closeFrom)
          return false;
      }
      if (closeTo) {
        if (!d.expected_close_date || d.expected_close_date > closeTo)
          return false;
      }
      return true;
    });

    const val = (d: Deal): string | number => {
      switch (sort.key) {
        case "name":
          return d.name.toLowerCase();
        case "value":
          return d.value ?? -Infinity;
        case "expected_close_date":
          return d.expected_close_date ?? "";
      }
    };

    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [deals, stage, source, owner, closeFrom, closeTo, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function clearFilters() {
    setStage("");
    setSource("");
    setOwner("");
    setCloseFrom("");
    setCloseTo("");
  }

  const anyFilter = stage || source || owner || closeFrom || closeTo;
  const total = filtered.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className={selectClass}
        >
          <option value="">All stages</option>
          {DEAL_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
        <label className="flex items-center gap-1 text-xs text-gray-500">
          Close
          <input
            type="date"
            value={closeFrom}
            onChange={(e) => setCloseFrom(e.target.value)}
            className={selectClass}
          />
          –
          <input
            type="date"
            value={closeTo}
            onChange={(e) => setCloseTo(e.target.value)}
            className={selectClass}
          />
        </label>
        {anyFilter && (
          <button
            onClick={clearFilters}
            className="rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} of {deals.length} shown · {formatMoney(total)} total
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <SortHeader
                label="Deal"
                sortKey="name"
                sort={sort}
                onToggle={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <SortHeader
                label="Value"
                sortKey="value"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortHeader
                label="Close date"
                sortKey="expected_close_date"
                sort={sort}
                onToggle={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/deals/${d.id}`} className="hover:underline">
                    {d.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {d.contact ? (
                    <Link
                      href={`/contacts/${d.contact.id}`}
                      className="hover:underline"
                    >
                      {d.contact.company || d.contact.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STAGE_STYLES[d.deal_stage].badge}`}
                  >
                    {d.deal_stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatMoney(d.value, d.currency)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {d.expected_close_date ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{d.source ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {ownerName(d) || "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No deals match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
