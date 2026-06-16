"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateDealStage } from "@/app/(app)/deals/actions";
import {
  DEAL_STAGES,
  DEAL_STAGE_STYLES,
  formatMoney,
  type Deal,
  type DealStage,
} from "@/lib/types";

export function DealsKanban({ deals }: { deals: Deal[] }) {
  // Local copy so a dropped card moves instantly (optimistic) before the
  // server round-trip + revalidation lands.
  const [items, setItems] = useState(deals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync when the server sends fresh data (e.g. after a new deal is added),
  // so the board updates without a manual refresh. This render-phase sync is the
  // React-recommended alternative to a setState-in-effect.
  const [prevDeals, setPrevDeals] = useState(deals);
  if (deals !== prevDeals) {
    setPrevDeals(deals);
    setItems(deals);
  }

  function moveCard(id: string, stage: DealStage) {
    const current = items.find((d) => d.id === id);
    if (!current || current.deal_stage === stage) return;

    const snapshot = items;
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, deal_stage: stage } : d)),
    );

    startTransition(async () => {
      const res = await updateDealStage(id, stage);
      if (res?.error) {
        setItems(snapshot); // revert on failure
        alert(`Could not move deal: ${res.error}`);
      }
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage) => {
        const cards = items.filter((d) => d.deal_stage === stage);
        const styles = DEAL_STAGE_STYLES[stage];
        // Pipeline value = sum of this column's deal values.
        const total = cards.reduce((sum, d) => sum + (d.value ?? 0), 0);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) moveCard(dragId, stage);
              setDragId(null);
              setOverStage(null);
            }}
            className={`flex min-h-[calc(100vh-9rem)] min-w-56 flex-1 flex-col rounded-xl border p-3 transition-colors ${
              overStage === stage
                ? "border-gray-900 bg-gray-100"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                  <span className="text-sm font-semibold text-gray-800">
                    {stage}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
                  {cards.length}
                </span>
              </div>
              <div className="mt-1 text-xs font-medium text-gray-500">
                {formatMoney(total)}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {cards.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStage(null);
                  }}
                  className={`block cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-gray-300 active:cursor-grabbing ${
                    dragId === d.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {d.name}
                  </div>
                  {d.contact && (
                    <div className="text-xs text-gray-500">
                      {d.contact.company || d.contact.name}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">
                      {formatMoney(d.value, d.currency)}
                    </span>
                    <span className="text-gray-400">
                      {d.expected_close_date ?? "—"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {d.owner?.full_name?.split(" ")[0] ?? "Unassigned"}
                  </div>
                </Link>
              ))}
              {cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
