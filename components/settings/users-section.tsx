"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addUser,
  setUserActive,
  setUserRole,
} from "@/app/(app)/settings/actions";
import type { ProfileRow } from "@/app/(app)/settings/page";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function UsersSection({
  currentUserId,
  profiles,
}: {
  currentUserId: string;
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("sdr");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await addUser({ email, full_name: name, role });
    setAdding(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEmail("");
    setName("");
    setRole("sdr");
    router.refresh();
  }

  function onToggleActive(id: string, next: boolean) {
    startTransition(async () => {
      const res = await setUserActive(id, next);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  function onChangeRole(id: string, next: string) {
    startTransition(async () => {
      const res = await setUserRole(id, next);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Users</h2>

      {/* Add user */}
      <form
        onSubmit={onAdd}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <input
          type="email"
          required
          placeholder="email@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputClass}
        >
          <option value="sdr">SDR</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add user"}
        </button>
        {error && (
          <p className="text-sm text-red-600 sm:col-span-4">{error}</p>
        )}
      </form>

      {/* Users list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId;
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.full_name || "—"}
                    {isSelf && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={isSelf}
                      onChange={(e) => onChangeRole(p.id, e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="sdr">SDR</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleActive(p.id, !p.is_active)}
                      disabled={isSelf}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                        p.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {p.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Adding a user creates their account — no email is sent automatically.
        They sign in themselves at the login page, where a magic link is emailed
        once they request it.
      </p>
    </section>
  );
}
