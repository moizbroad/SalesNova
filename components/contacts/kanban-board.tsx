"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateContactStage } from "@/app/(app)/contacts/actions";
import {
  LEAD_STAGES,
  STAGE_STYLES,
  type Contact,
  type LeadStage,
} from "@/lib/types";

export function KanbanBoard({ contacts }: { contacts: Contact[] }) {
  // Local copy so a dropped card moves instantly (optimistic), before the
  // server round-trip + revalidation lands.
  const [items, setItems] = useState(contacts);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [, startTransition] = useTransition();

  function moveCard(id: string, stage: LeadStage) {
    const current = items.find((c) => c.id === id);
    if (!current || current.lead_stage === stage) return;

    const snapshot = items;
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, lead_stage: stage } : c)),
    );

    startTransition(async () => {
      const res = await updateContactStage(id, stage);
      if (res?.error) {
        setItems(snapshot); // revert on failure
        alert(`Could not move contact: ${res.error}`);
      }
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_STAGES.map((stage) => {
        const cards = items.filter((c) => c.lead_stage === stage);
        const styles = STAGE_STYLES[stage];
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
            className={`flex min-h-[calc(100vh-9rem)] min-w-40 flex-1 flex-col rounded-xl border p-3 transition-colors ${
              overStage === stage
                ? "border-gray-900 bg-gray-100"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
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

            <div className="flex flex-1 flex-col gap-2">
              {cards.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStage(null);
                  }}
                  className={`block cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-gray-300 active:cursor-grabbing ${
                    dragId === c.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {c.name}
                  </div>
                  {c.company && (
                    <div className="text-xs text-gray-500">{c.company}</div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{c.lead_source ?? "—"}</span>
                    <span>{c.owner?.full_name?.split(" ")[0] ?? ""}</span>
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
