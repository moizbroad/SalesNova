import { STAGE_STYLES, type LeadStage } from "@/lib/types";

export type StageHistoryRow = {
  id: string;
  to_stage: LeadStage;
  changed_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function StageTimeline({ history }: { history: StageHistoryRow[] }) {
  if (!history.length) {
    return <p className="text-sm text-gray-400">No stage history yet.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {history.map((h, i) => {
        const styles = STAGE_STYLES[h.to_stage];
        return (
          <div key={h.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">→</span>}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              {h.to_stage}
              <span className="text-gray-400">· {fmtDate(h.changed_at)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
