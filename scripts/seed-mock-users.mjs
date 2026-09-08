import { createClient } from "@supabase/supabase-js";

const DEV_FAMILY_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_PASSWORD = "dev123456";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.MOCK_AUTH_PASSWORD ?? DEFAULT_PASSWORD;

if (!serviceRoleKey) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY mancante. Esegui supabase status e aggiorna .env.local.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser(member) {
  if (member.auth_user_id) {
    const { error } = await admin.auth.admin.updateUserById(
      member.auth_user_id,
      { password, email_confirm: true },
    );
    if (error) throw new Error(error.message);
    return member.auth_user_id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
    user_metadata: member.full_name
      ? { full_name: member.full_name, name: member.full_name }
      : undefined,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "createUser fallito");
  }

  const { data: linked, error: linkError } = await admin
    .from("members")
    .select("auth_user_id")
    .eq("id", member.id)
    .maybeSingle();

  if (linkError) throw new Error(linkError.message);

  return linked?.auth_user_id ?? data.user.id;
}

async function ensureFamilyMember(userId) {
  const { error } = await admin.from("family_members").upsert(
    {
      family_id: DEV_FAMILY_ID,
      user_id: userId,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (error) throw new Error(error.message);
}

async function main() {
  const { data: members, error } = await admin
    .from("members")
    .select("id, email, full_name, auth_user_id")
    .is("disabled_at", null)
    .order("email");

  if (error) throw new Error(error.message);

  for (const member of members ?? []) {
    const userId = await ensureAuthUser(member);
    await ensureFamilyMember(userId);
    console.log(`✓ ${member.email} → ${userId}`);
  }

  console.log("Seed mock users completato.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
