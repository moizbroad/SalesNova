"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateBranding } from "@/app/(app)/settings/actions";

export function BrandingSection({
  companyName: initialName,
  logoUrl: initialLogo,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSaved(false);
    setUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }

    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await updateBranding({
      company_name: companyName.trim(),
      logo_url: logoUrl,
    });

    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Branding</h2>

      <form
        onSubmit={onSave}
        className="space-y-5 rounded-xl border border-gray-200 bg-white shadow-sm p-6"
      >
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Company logo"
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
              No logo
            </div>
          )}
          <label className="inline-block cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {uploading ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={onPickLogo}
            />
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Company name
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save branding"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </section>
  );
}
