"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LEAD_STAGES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  STAGE_STYLES,
  type Contact,
  type ProfileOption,
} from "@/lib/types";

type SortKey =
  | "name"
  | "company"
  | "lead_stage"
  | "lead_status"
  | "lead_source"
  | "owner"
  | "next_action_date";
type SortDir = "asc" | "desc";

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none";

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-3 font-medium">
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

export function ContactsTable({
  contacts,
  owners,
}: {
  contacts: Contact[];
  owners: ProfileOption[];
}) {
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });

  const ownerName = (c: Contact) => c.owner?.full_name || c.owner?.email || "";

  const filtered = useMemo(() => {
    const rows = contacts.filter((c) => {
      if (stage && c.lead_stage !== stage) return false;
      if (status && c.lead_status !== status) return false;
      if (source && (c.lead_source ?? "") !== source) return false;
      if (owner) {
        if (owner === "unassigned" ? c.owner_id !== null : c.owner_id !== owner)
          return false;
      }
      if (query) {
        const q = query.toLowerCase();
        const hay =
          `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const val = (c: Contact): string | number => {
      switch (sort.key) {
        case "name":
          return c.name.toLowerCase();
        case "company":
          return (c.company ?? "").toLowerCase();
        case "lead_stage":
          return LEAD_STAGES.indexOf(c.lead_stage);
        case "lead_status":
          return LEAD_STATUSES.indexOf(c.lead_status);
        case "lead_source":
          return (c.lead_source ?? "").toLowerCase();
        case "owner":
          return ownerName(c).toLowerCase();
        case "next_action_date":
          return c.next_action_date ?? "";
      }
    };

    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [contacts, stage, status, source, owner, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function clearFilters() {
    setStage("");
    setStatus("");
    setSource("");
    setOwner("");
    setQuery("");
  }

  const anyFilter = stage || status || source || owner || query;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, email…"
          className="min-w-50 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className={selectClass}
        >
          <option value="">All stages</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
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
        {filtered.length} of {contacts.length} shown
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {(
                [
                  ["Name", "name"],
                  ["Company", "company"],
                  ["Stage", "lead_stage"],
                  ["Status", "lead_status"],
                  ["Source", "lead_source"],
                  ["Owner", "owner"],
                  ["Next action", "next_action_date"],
                ] as [string, SortKey][]
              ).map(([label, key]) => (
                <SortHeader
                  key={key}
                  label={label}
                  sortKey={key}
                  sort={sort}
                  onToggle={toggleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/contacts/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[c.lead_stage].badge}`}
                  >
                    {c.lead_stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.lead_status}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.lead_source ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {ownerName(c) || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.next_action ?? "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No contacts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
