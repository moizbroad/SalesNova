"use client";

import { useState } from "react";
import {
  NotesSection,
  ConversationsSection,
  MeetingsSection,
} from "./activity-sections";
import type { Note, Conversation, Meeting } from "@/lib/types";

type TabKey = "notes" | "conversations" | "meetings";

export function ActivityTabs({
  contactId,
  notes,
  conversations,
  meetings,
  isAdmin = false,
}: {
  contactId: string;
  notes: Note[];
  conversations: Conversation[];
  meetings: Meeting[];
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("notes");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "notes", label: "Notes", count: notes.length },
    { key: "conversations", label: "Conversations", count: conversations.length },
    { key: "meetings", label: "Meetings", count: meetings.length },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-500">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "notes" && (
        <NotesSection contactId={contactId} notes={notes} isAdmin={isAdmin} />
      )}
      {tab === "conversations" && (
        <ConversationsSection
          contactId={contactId}
          conversations={conversations}
        />
      )}
      {tab === "meetings" && (
        <MeetingsSection contactId={contactId} meetings={meetings} />
      )}
    </div>
  );
}
