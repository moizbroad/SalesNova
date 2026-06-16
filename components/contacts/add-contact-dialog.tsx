"use client";

import { useActionState, useRef, useState } from "react";
import {
  createContact,
  type CreateContactState,
} from "@/app/(app)/contacts/actions";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  type ProfileOption,
} from "@/lib/types";

const initialState: CreateContactState = {};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none";

export function AddContactDialog({ owners }: { owners: ProfileOption[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Wrap the action so we can close + reset the form once the server
  // confirms the insert succeeded (avoids a setState-in-effect cascade).
  const [state, formAction, pending] = useActionState(
    async (prev: CreateContactState, formData: FormData) => {
      const result = await createContact(prev, formData);
      if (result.ok) {
        setOpen(false);
        formRef.current?.reset();
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
        + Add contact
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
            <h2 className="text-lg font-semibold">New contact</h2>

            <form ref={formRef} action={formAction} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Name *
                </label>
                <input name="name" required autoFocus className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Company
                  </label>
                  <input name="company" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Email
                  </label>
                  <input name="email" type="email" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Phone
                  </label>
                  <input name="phone" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    LinkedIn URL
                  </label>
                  <input name="linkedin_url" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Source
                  </label>
                  <select name="lead_source" className={inputClass} defaultValue="">
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
                    Stage
                  </label>
                  <select
                    name="lead_stage"
                    className={inputClass}
                    defaultValue="New"
                  >
                    {LEAD_STAGES.map((s) => (
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
                  <select name="owner_id" className={inputClass} defaultValue="">
                    <option value="">Me</option>
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
                  {pending ? "Saving…" : "Create contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
