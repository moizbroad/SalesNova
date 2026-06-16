"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // "email" = ask for email, "code" = email sent, ask for the 6-digit code.
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — send the sign-in email. The email template emits a 6-digit code
  // ({{ .Token }}) plus a magic link ({{ .ConfirmationURL }}) as a fallback, so
  // we keep emailRedirectTo for that link. shouldCreateUser:false means only
  // emails an admin has already added can sign in.
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        setError(
          "Too many sign-in emails for now. Please wait a bit and try again.",
        );
      } else {
        setError("No access — ask your admin to add your email.");
      }
      return;
    }
    setStep("code");
  }

  // Step 2 — verify the 6-digit code, then enforce the active-account gate
  // (mirrors the magic-link callback so disabled accounts can't get in).
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error || !data.user) {
      setLoading(false);
      setError("That code is invalid or expired. Check it or resend.");
      return;
    }

    // Allowlist gate: the account must exist and be active.
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .single();

    if (!profile || profile.is_active !== true) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("No access — your account is disabled. Ask your admin.");
      return;
    }

    // Full reload so the server picks up the new session cookies.
    window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dark.svg" alt="StrategistHub" className="h-10 w-auto" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-gray-700">
          CRM
        </h1>

        {step === "code" ? (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <p className="text-sm text-gray-700">
              We sent a 6-digit code to{" "}
              <span className="font-medium">{email}</span>. Enter it below.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.3em] focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              ← Use a different email
            </button>
          </form>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your work email.
            </p>
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send sign-in code"}
              </button>
            </form>
          </>
        )}

        {(error || urlError) && (
          <p className="mt-4 text-sm text-red-600">{error || urlError}</p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
