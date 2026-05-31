/**
 * Read-only investigation: Clare Barton auth/password conflict.
 * Usage: node scripts/investigate-clare-auth-readonly.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_EMAIL = "clarembarton@hotmail.com";
const CLARE_USER_ID = "b3092955-e688-43c0-bb0c-adbfae7e7b62";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < perPage) break;
    page += 1;
  }
  return users;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const normalizedTarget = TARGET_EMAIL.trim().toLowerCase();

const allAuth = await listAllAuthUsers(supabase);
const authByEmail = allAuth.filter(
  (u) => u.email?.trim().toLowerCase() === normalizedTarget,
);

const { data: usersByEmail, error: usersEmailErr } = await supabase
  .from("users")
  .select(
    "id, first_name, last_name, email, portal_login_email, auth_user_id, portal_auth_status, portal_invited_at, created_at",
  )
  .or(`email.ilike.${TARGET_EMAIL},portal_login_email.ilike.${TARGET_EMAIL}`);

if (usersEmailErr) throw new Error(usersEmailErr.message);

const { data: usersByName, error: usersNameErr } = await supabase
  .from("users")
  .select(
    "id, first_name, last_name, email, portal_login_email, auth_user_id, portal_auth_status, portal_invited_at, created_at",
  )
  .ilike("first_name", "clare")
  .ilike("last_name", "barton");

if (usersNameErr) throw new Error(usersNameErr.message);

const { data: userById, error: userIdErr } = await supabase
  .from("users")
  .select(
    "id, first_name, last_name, email, portal_login_email, auth_user_id, portal_auth_status, portal_invited_at, created_at",
  )
  .eq("id", CLARE_USER_ID)
  .maybeSingle();

if (userIdErr) throw new Error(userIdErr.message);

const profileIds = new Set([
  ...(usersByEmail ?? []).map((u) => u.id),
  ...(usersByName ?? []).map((u) => u.id),
  ...(userById ? [userById.id] : []),
]);

const { data: memberships, error: memErr } = await supabase
  .from("memberships")
  .select("id, user_id, club_id, role, status, created_at, clubs(name, slug)")
  .in("user_id", [...profileIds]);

if (memErr) throw new Error(memErr.message);

const authIds = new Set([
  ...authByEmail.map((u) => u.id),
  ...(usersByEmail ?? []).map((u) => u.auth_user_id).filter(Boolean),
  ...(usersByName ?? []).map((u) => u.auth_user_id).filter(Boolean),
  userById?.auth_user_id,
].filter(Boolean));

const authLinkedProfiles = [];
for (const authId of authIds) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, portal_login_email, auth_user_id, first_name, last_name")
    .eq("auth_user_id", authId);
  if (error) throw new Error(error.message);
  if (data?.length) authLinkedProfiles.push({ authId, profiles: data });
}

const report = {
  targetEmail: TARGET_EMAIL,
  authUsersMatchingEmail: authByEmail.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed_at: u.email_confirmed_at,
  })),
  authUserCountForEmail: authByEmail.length,
  publicUsersByEmail: usersByEmail,
  publicUsersByNameClareBarton: usersByName,
  publicUserByKnownId: userById,
  duplicatePublicUserCount: new Set([...(usersByEmail ?? []), ...(usersByName ?? [])].map((u) => u.id)).size,
  memberships,
  profilesLinkedToAuthIds: authLinkedProfiles,
};

console.log(JSON.stringify(report, null, 2));
