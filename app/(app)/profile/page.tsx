import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = { title: "Profile · StrategistHub CRM" };

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, avatar_url")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
        <p className="mt-3 text-sm text-gray-500">
          Update your name and photo. Your teammates see these.
        </p>
      </div>

      <ProfileForm
        userId={user!.id}
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? user!.email ?? ""}
        role={profile?.role ?? "sdr"}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
