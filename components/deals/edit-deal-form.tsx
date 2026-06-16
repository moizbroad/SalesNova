"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDeal } from "@/app/(app)/deals/actions";
import {
  DEAL_STAGES,
  LEAD_SOURCES,
  type ContactOption,
  type Deal,
  type ProfileOption,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

const nn = (v: string) => (v.trim() === "" ? null : v.trim());
const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function EditDealForm({
  deal,
  owners,
  contacts,
}: {
  deal: Deal;
  owners: ProfileOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: deal.name ?? "",
    contact_id: deal.contact_id ?? "",
    deal_stage: deal.deal_stage,
    value: deal.value != null ? String(deal.value) : "",
    currency: deal.currency ?? "USD",
    probability: deal.probability != null ? String(deal.probability) : "",
    expected_close_date: deal.expected_close_date ?? "",
    source: deal.source ?? "",
    owner_id: deal.owner_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setSaved(false);
    };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await updateDeal(deal.id, {
      name: form.name.trim(),
      contact_id: nn(form.contact_id),
      deal_stage: form.deal_stage,
      value: num(form.value),
      currency: form.currency.trim() || "USD",
      probability: num(form.probability),
      expected_close_date: nn(form.expected_close_date),
      source: nn(form.source),
      owner_id: nn(form.owner_id),
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
        <div className="sm:col-span-2">
          <label className={labelClass}>Deal name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Linked contact</label>
          <select
            value={form.contact_id}
            onChange={set("contact_id")}
            className={inputClass}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company ? `${c.company} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Stage</label>
          <select
            value={form.deal_stage}
            onChange={set("deal_stage")}
            className={inputClass}
          >
            {DEAL_STAGES.map((s) => (
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
          <label className={labelClass}>Value</label>
          <input
            type="number"
            min="0"
            step="any"
            value={form.value}
            onChange={set("value")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <input
            value={form.currency}
            onChange={set("currency")}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Probability %</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.probability}
            onChange={set("probability")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Expected close</label>
          <input
            type="date"
            value={form.expected_close_date}
            onChange={set("expected_close_date")}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Source</label>
          <select
            value={form.source}
            onChange={set("source")}
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
