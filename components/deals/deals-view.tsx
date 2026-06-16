"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddDealDialog } from "./add-deal-dialog";
import { DealsTable } from "./deals-table";
import { DealsKanban } from "./deals-kanban";
import {
  CLOSED_DEAL_STAGES,
  formatMoney,
  type ContactOption,
  type Deal,
  type ProfileOption,
} from "@/lib/types";
import { ListIcon, KanbanIcon } from "@/components/icons";

type View = "kanban" | "table";

export function DealsView({
  deals,
  owners,
  contacts,
  initialView = "kanban",
  currentUserId,
}: {
  deals: Deal[];
  owners: ProfileOption[];
  contacts: ContactOption[];
  initialView?: View;
  currentUserId: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);

  // Switch view + remember the choice in the URL (shareable, survives reload).
  function selectView(next: View) {
    setView(next);
    router.replace(`/deals?view=${next}`, { scroll: false });
  }

  // Headline = open pipeline (everything not closed won/lost).
  const openValue = deals
    .filter((d) => !CLOSED_DEAL_STAGES.includes(d.deal_stage as never))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-2 text-sm text-gray-500">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} ·{" "}
            {formatMoney(openValue)} open pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
            <button
              onClick={() => selectView("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                view === "kanban"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <KanbanIcon className="h-4 w-4" />
              Board
            </button>
            <button
              onClick={() => selectView("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                view === "table"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListIcon className="h-4 w-4" />
              Table
            </button>
          </div>
          <Link
            href="/deals/reports"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Reports
          </Link>
          <AddDealDialog
            owners={owners}
            contacts={contacts}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">
            No deals yet. Convert a contact or create one to get started.
          </p>
        </div>
      ) : view === "kanban" ? (
        <DealsKanban deals={deals} />
      ) : (
        <DealsTable deals={deals} owners={owners} />
      )}
    </div>
  );
}
