import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but guard again for safety.
  if (!user) redirect("/login");

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("settings")
      .select("company_name, logo_url")
      .eq("id", 1)
      .single(),
  ]);

  const displayName = profile?.full_name || profile?.email || user.email;
  const isAdmin = profile?.role === "admin";
  const companyName = settings?.company_name || "StrategistHub CRM";

  return (
    <div className="flex min-h-screen bg-[#f3f5fb] text-gray-900">
      {/* Left sidebar — primary navigation (brand navy) */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 border-t-2 border-t-brand bg-navy text-gray-200">
        <div className="border-b border-white/10 px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo_url}
                alt={companyName}
                className="h-9 w-auto max-w-44 object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo-light.svg"
                alt={companyName}
                className="h-9 w-auto max-w-44 object-contain"
              />
            )}
          </Link>
        </div>

        <SidebarNav isAdmin={isAdmin} />

        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-gray-200">
                {(displayName ?? "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">
                {displayName}
              </div>
              <div className="text-xs uppercase tracking-wide text-gray-400">
                {profile?.role ?? "sdr"}
              </div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1600px] px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
