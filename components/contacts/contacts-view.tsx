"use client";

import { useState } from "react";
import { AddContactDialog } from "./add-contact-dialog";
import { ContactsTable } from "./contacts-table";
import { KanbanBoard } from "./kanban-board";
import type { Contact, ProfileOption } from "@/lib/types";
import { ListIcon, KanbanIcon } from "@/components/icons";

type View = "list" | "kanban";

export function ContactsView({
  contacts,
  owners,
}: {
  contacts: Contact[];
  owners: ProfileOption[];
}) {
  const [view, setView] = useState<View>("list");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
          <p className="mt-2 text-sm text-gray-500">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                view === "list"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListIcon className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                view === "kanban"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <KanbanIcon className="h-4 w-4" />
              Kanban
            </button>
          </div>
          <AddContactDialog owners={owners} />
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">
            No contacts yet. Add your first one to get started.
          </p>
        </div>
      ) : view === "list" ? (
        <ContactsTable contacts={contacts} owners={owners} />
      ) : (
        <KanbanBoard contacts={contacts} />
      )}
    </div>
  );
}
