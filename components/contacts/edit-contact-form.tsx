"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContact } from "@/app/(app)/contacts/actions";
import {
  LEAD_STAGES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  type Contact,
  type ProfileOption,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

const nn = (v: string) => (v.trim() === "" ? null : v.trim());

export function EditContactForm({
  contact,
  owners,
}: {
  contact: Contact;
  owners: ProfileOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: contact.name ?? "",
    company: contact.company ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    lead_source: contact.lead_source ?? "",
    lead_stage: contact.lead_stage,
    lead_status: contact.lead_status,
    owner_id: contact.owner_id ?? "",
    next_action: contact.next_action ?? "",
    next_action_date: contact.next_action_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setSaved(false);
    };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await updateContact(contact.id, {
      name: form.name.trim(),
      company: nn(form.company),
      email: nn(form.email),
      phone: nn(form.phone),
      linkedin_url: nn(form.linkedin_url),
      lead_source: nn(form.lead_source),
      lead_stage: form.lead_stage,
      lead_status: form.lead_status,
      owner_id: nn(form.owner_id),
      next_action: nn(form.next_action),
      next_action_date: nn(form.next_action_date),
    });

    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh(); // refresh header + stage timeline
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <input
            value={form.company}
            onChange={set("company")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            value={form.phone}
            onChange={set("phone")}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>LinkedIn URL</label>
          <input
            value={form.linkedin_url}
            onChange={set("linkedin_url")}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Stage</label>
          <select
            value={form.lead_stage}
            onChange={set("lead_stage")}
            className={inputClass}
          >
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.lead_status}
            onChange={set("lead_status")}
            className={inputClass}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Source</label>
          <select
            value={form.lead_source}
            onChange={set("lead_source")}
            className={inputClass}
          >
            <option value="">—</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Owner</label>
          <select
            value={form.owner_id}
            onChange={set("owner_id")}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name || o.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Next action</label>
          <input
            value={form.next_action}
            onChange={set("next_action")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Next action date</label>
          <input
            type="date"
            value={form.next_action_date}
            onChange={set("next_action_date")}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
