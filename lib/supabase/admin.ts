import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and can manage auth users.
// SERVER ONLY. Never import this from a Client Component. The `server-only`
// package makes the build fail if that ever happens.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
