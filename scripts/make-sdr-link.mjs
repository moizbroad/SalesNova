// One-off: create (or reuse) an SDR test account and print a sign-in link.
// Run: node --env-file=.env.local scripts/make-sdr-link.mjs ali@shteam.co "Ali" sdr
import { createClient } from "@supabase/supabase-js";

const [, , emailArg, nameArg, roleArg] = process.argv;
const email = (emailArg || "ali@shteam.co").trim().toLowerCase();
const full_name = nameArg || "Ali";
const role = roleArg === "admin" ? "admin" : "sdr";
const SITE = process.env.SITE_URL || "http://localhost:3000";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// 1. Create the auth user (reuse if it already exists).
let userId;
const created = await admin.auth.admin.createUser({
  email,
  email_confirm: true,
  user_metadata: { full_name },
});
if (created.error) {
  if (/already|registered|exists/i.test(created.error.message)) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) throw new Error("User exists but could not be located.");
  } else {
    throw created.error;
  }
} else {
  userId = created.data.user.id;
}

// 2. Upsert the profile as an active SDR.
const { error: upErr } = await admin
  .from("profiles")
  .upsert(
    { id: userId, email, full_name, role, is_active: true },
    { onConflict: "id" },
  );
if (upErr) throw upErr;

// 3. Generate a sign-in link (token-hash style, matches /auth/callback).
const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: `${SITE}/auth/callback` },
});
if (error) throw error;

const tokenHash = data.properties.hashed_token;
const localLink = `${SITE}/auth/callback?token_hash=${tokenHash}&type=magiclink`;

console.log("\n✅  SDR test account ready");
console.log(`   email : ${email}`);
console.log(`   name  : ${full_name}`);
console.log(`   role  : ${role}`);
console.log("\n🔗  Sign-in link (open in a fresh/incognito window):\n");
console.log(localLink);
console.log("\n(Supabase action_link fallback:)");
console.log(data.properties.action_link);
console.log("");
