"use client";

import { useState, useTransition } from "react";
import { convertContactToDeal } from "@/app/(app)/deals/actions";

// Admin-only "Convert to Opportunity" button shown on the contact detail page.
// On success the server action redirects to the new deal; on failure it returns
// an error we surface inline.
export function ConvertButton({ contactId }: { contactId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await convertContactToDeal(contactId);
            // Reaches here only on failure — success throws a redirect.
            if (res?.error) setError(res.error);
          })
        }
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-[0_2px_12px_-2px_rgba(170,7,39,0.6)] transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Converting…" : "Convert to Opportunity"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
