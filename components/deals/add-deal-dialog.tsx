"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal, type CreateDealState } from "@/app/(app)/deals/actions";
import {
  DEAL_STAGES,
  LEAD_SOURCES,
  type ContactOption,
  type ProfileOption,
} from "@/lib/types";

const initialState: CreateDealState = {};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none";

export function AddDealDialog({
  owners,
  contacts,
  currentUserId,
}: {
  owners: ProfileOption[];
  contacts: ContactOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: CreateDealState, formData: FormData) => {
      const result = await createDeal(prev, formData);
      if (result.ok) {
        setOpen(false);
        formRef.current?.reset();
        router.refresh(); // pull the new deal into the list — no manual reload
      }
      return result;
    },
    initialState,
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        + New deal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-12 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">New deal</h2>

            <form ref={formRef} action={formAction} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Deal name *
                </label>
                <input name="name" required autoFocus className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Linked contact
                </label>
                <select name="contact_id" className={inputClass} defaultValue="">
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} — ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Value
                  </label>
                  <input
                    name="value"
                    type="number"
                    min="0"
                    step="any"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Currency
                  </label>
                  <input
                    name="currency"
                    defaultValue="USD"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Probability %
                  </label>
                  <input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Stage
                  </label>
                  <select
                    name="deal_stage"
                    className={inputClass}
                    defaultValue="Discovery"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Expected close
                  </label>
                  <input
                    name="expected_close_date"
                    type="date"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Source
                  </label>
                  <select name="source" className={inputClass} defaultValue="">
                    <option value="">—</option>
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Owner
                  </label>
                  <select
                    name="owner_id"
                    className={inputClass}
                    defaultValue={currentUserId}
                  >
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name || o.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Create deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
