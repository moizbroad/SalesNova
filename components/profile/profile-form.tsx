"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/(app)/profile/actions";

function initials(name: string, email: string) {
  const base = name.trim() || email;
  return base.slice(0, 2).toUpperCase();
}

export function ProfileForm({
  userId,
  fullName: initialName,
  email,
  role,
  avatarUrl: initialAvatar,
}: {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSaved(false);
    setUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // Fixed path per user; upsert overwrites the previous photo.
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately.
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl,
    });

    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh(); // updates the sidebar name + avatar
  }

  return (
    <form
      onSubmit={onSave}
      className="space-y-6 rounded-xl border border-gray-200 bg-white shadow-sm p-6"
    >
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Your avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-500">
            {initials(fullName, email)}
          </div>
        )}
        <div>
          <label className="inline-block cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {uploading ? "Uploading…" : "Change photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={onPickFile}
            />
          </label>
          <p className="mt-1 text-xs text-gray-400">JPG or PNG.</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Full name
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Email
        </label>
        <input
          value={email}
          disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      {/* Role (read-only) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Role
        </label>
        <input
          value={role.toUpperCase()}
          disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm uppercase tracking-wide text-gray-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
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
