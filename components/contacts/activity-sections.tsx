"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "./rich-text-editor";
import {
  addNote,
  updateNote,
  addConversation,
  addMeeting,
} from "@/app/(app)/contacts/[id]/activity-actions";
import type { Author, Note, Conversation, Meeting } from "@/lib/types";

// ---- helpers ---------------------------------------------------------------

function authorName(a: Author | null) {
  return a?.full_name || a?.email || "Someone";
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function nowLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

const card = "rounded-xl border border-gray-200 bg-white shadow-sm p-6";
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none";
const primaryBtn =
  "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50";

// ---- Notes -----------------------------------------------------------------

function NoteItem({
  note,
  contactId,
  isAdmin,
}: {
  note: Note;
  contactId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateNote(note.id, contactId, body);
    setBusy(false);
    if (res?.error) return setError(res.error);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-lg bg-gray-50 p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={inputClass}
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
      </div>
    );
  }

  return (
    <div className="group rounded-lg bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap wrap-break-word text-sm text-gray-800">
          {note.body}
        </p>
        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs font-medium text-gray-400 opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
          >
            Edit
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {authorName(note.author)} · {fmtDateTime(note.created_at)}
      </p>
    </div>
  );
}

export function NotesSection({
  contactId,
  notes,
  isAdmin = false,
}: {
  contactId: string;
  notes: Note[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addNote(contactId, body);
    setBusy(false);
    if (res?.error) return setError(res.error);
    setBody("");
    router.refresh();
  }

  return (
    <section className={card}>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Notes</h2>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Adding…" : "Add note"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-gray-400">No notes yet.</p>
        )}
        {notes.map((n) => (
          <NoteItem
            key={n.id}
            note={n}
            contactId={contactId}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </section>
  );
}

// ---- Conversations ---------------------------------------------------------

export function ConversationsSection({
  contactId,
  conversations,
}: {
  contactId: string;
  conversations: Conversation[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState("LinkedIn");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addConversation(contactId, {
      channel,
      content,
      occurred_at: occurredAt || null,
    });
    setBusy(false);
    if (res?.error) return setError(res.error);
    setContent("");
    setOccurredAt(nowLocal());
    router.refresh();
  }

  return (
    <section className={card}>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Conversations
      </h2>
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={`${inputClass} max-w-35`}
          >
            <option value="LinkedIn">LinkedIn</option>
            <option value="Email">Email</option>
          </select>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={`${inputClass} max-w-55`}
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What was said…"
          rows={3}
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Logging…" : "Log conversation"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {conversations.length === 0 && (
          <p className="text-sm text-gray-400">No conversations logged yet.</p>
        )}
        {conversations.map((c) => (
          <div key={c.id} className="rounded-lg bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                {c.channel}
              </span>
              <span className="text-xs text-gray-400">
                {fmtDateTime(c.occurred_at ?? c.created_at)}
              </span>
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-sm text-gray-800">
              {c.content}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {authorName(c.author)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Meetings --------------------------------------------------------------

function MeetingItem({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {meeting.title || "Untitled meeting"}
          </p>
          <p className="text-xs text-gray-400">
            {fmtDate(meeting.meeting_date)} · {authorName(meeting.author)}
          </p>
        </div>
        {meeting.notes && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {open ? "Hide notes" : "Show notes"}
          </button>
        )}
      </div>
      {open && meeting.notes && (
        <div
          className="richtext mt-2 wrap-break-word border-t border-gray-200 pt-2 text-sm text-gray-800"
          dangerouslySetInnerHTML={{ __html: meeting.notes }}
        />
      )}
    </div>
  );
}

export function MeetingsSection({
  contactId,
  meetings,
}: {
  contactId: string;
  meetings: Meeting[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Remount the editor after a successful save so it clears.
  const [editorKey, setEditorKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addMeeting(contactId, {
      title,
      meeting_date: date || null,
      notes,
    });
    setBusy(false);
    if (res?.error) return setError(res.error);
    setTitle("");
    setDate("");
    setNotes("");
    setEditorKey((k) => k + 1);
    router.refresh();
  }

  return (
    <section className={card}>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Meetings</h2>
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className={inputClass}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} max-w-45`}
          />
        </div>
        <RichTextEditor key={editorKey} value={notes} onChange={setNotes} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Saving…" : "Save meeting"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {meetings.length === 0 && (
          <p className="text-sm text-gray-400">No meetings yet.</p>
        )}
        {meetings.map((m) => (
          <MeetingItem key={m.id} meeting={m} />
        ))}
      </div>
    </section>
  );
}
