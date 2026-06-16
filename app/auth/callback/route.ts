import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Completes sign-in. Handles two link styles:
//  - ?code=...                     (PKCE — normal magic-link email)
//  - ?token_hash=...&type=magiclink (admin-generated link / token-hash flow)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorDescription = searchParams.get("error_description");

  const loginWithError = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (errorDescription) return loginWithError(errorDescription);

  const supabase = await createClient();
  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user)
      return loginWithError("Sign-in link expired. Request a new one.");
    userId = data.user.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error || !data.user)
      return loginWithError("Sign-in link expired. Request a new one.");
    userId = data.user.id;
  } else {
    return loginWithError("Sign-in link was invalid. Request a new one.");
  }

  // Allowlist gate: the account must exist and be active.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (!profile || profile.is_active !== true) {
    await supabase.auth.signOut();
    return loginWithError("No access — your account is disabled. Ask your admin.");
  }

  return NextResponse.redirect(`${origin}/`);
}
