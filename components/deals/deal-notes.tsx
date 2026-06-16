"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDealNote, updateDealNote } from "@/app/(app)/deals/actions";
import type { DealNote } from "@/lib/types";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const textareaClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none";
const primaryBtn =
  "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50";

function DealNoteItem({ note, dealId }: { note: DealNote; dealId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateDealNote(note.id, dealId, body);
    setBusy(false);
    if (res?.error) return setError(res.error);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={textareaClass}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy || !body.trim()}
            className={primaryBtn}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setBody(note.body);
              setError(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Cancel
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-sm text-gray-800">{note.body}</p>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs font-medium text-gray-400 opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
        >
          Edit
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {note.author?.full_name || note.author?.email || "Unknown"} ·{" "}
        {fmtDateTime(note.created_at)}
      </p>
    </li>
  );
}

export function DealNotes({
  dealId,
  notes,
}: {
  dealId: string;
  notes: DealNote[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);

    const res = await addDealNote(dealId, body);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add note"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <DealNoteItem key={n.id} note={n} dealId={dealId} />
          ))}
        </ul>
      )}
    </div>
  );
}
