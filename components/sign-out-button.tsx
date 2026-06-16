"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/login");
  }

  return (
    <button
      onClick={signOut}
      className="w-full rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
