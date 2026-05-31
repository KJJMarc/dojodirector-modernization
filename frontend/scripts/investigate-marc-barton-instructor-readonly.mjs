/**
 * Read-only investigation: Marc Barton instructor / super_admin access.
 * Usage: node scripts/investigate-marc-barton-instructor-readonly.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARC_USER_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const INSTRUCTOR_ROLES = new Set(["instructor", "admin", "super_admin"]);

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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  section("Users by id");
  const { data: marcById, error: marcByIdErr } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, auth_user_id, portal_auth_status, portal_login_email, instructor_portal_auth_status, instructor_portal_login_email, instructor_portal_invited_at",
    )
    .eq("id", MARC_USER_ID)
    .maybeSingle();
  if (marcByIdErr) throw marcByIdErr;
  console.log("marcById:", marcById ?? null);

  section("Users named Marc Barton");
  const { data: marcByName, error: marcNameErr } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .ilike("first_name", "Marc")
    .ilike("last_name", "Barton");
  if (marcNameErr) throw marcNameErr;
  console.log("count:", marcByName?.length ?? 0);
  for (const row of marcByName ?? []) {
    console.log(row);
  }

  section("All memberships for Marc (any club)");
  const { data: allMemberships, error: memErr } = await supabase
    .from("memberships")
    .select("id, user_id, club_id, role, status, joined_at, created_at, updated_at")
    .eq("user_id", MARC_USER_ID);
  if (memErr) throw memErr;
  console.log(allMemberships ?? []);

  section("KJJ membership for Marc");
  const { data: kjjMem, error: kjjErr } = await supabase
    .from("memberships")
    .select("id, user_id, club_id, role, status, joined_at")
    .eq("user_id", MARC_USER_ID)
    .eq("club_id", KJJ_CLUB_ID)
    .maybeSingle();
  if (kjjErr) throw kjjErr;
  console.log(kjjMem ?? null);

  section("Instructor portal gate check");
  const role = kjjMem?.role ?? null;
  console.log({
    hasKjjMembership: Boolean(kjjMem),
    instructorPortalRoleOk: INSTRUCTOR_ROLES.has(role ?? ""),
    instructorPortalAuthStatus: marcById?.instructor_portal_auth_status ?? null,
    instructorPortalAuthOk: ["active", "invited"].includes(
      marcById?.instructor_portal_auth_status ?? "",
    ),
    authUserId: marcById?.auth_user_id ?? null,
    instructorPortalLoginEmail:
      marcById?.instructor_portal_login_email ?? marcById?.email ?? null,
  });

  section("Auth users matching Marc emails");
  const emails = new Set(
    [marcById?.email, marcById?.instructor_portal_login_email, marcById?.portal_login_email]
      .filter(Boolean)
      .map((e) => e.toLowerCase()),
  );
  let page = 1;
  const authMatches = [];
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users ?? []) {
      if (u.email && emails.has(u.email.toLowerCase())) {
        authMatches.push({ id: u.id, email: u.email });
      }
    }
    if ((data.users ?? []).length < 200) break;
    page += 1;
  }
  console.log("authMatches:", authMatches);
  if (marcById?.auth_user_id) {
    const { data: linked, error: linkedErr } = await supabase.auth.admin.getUserById(
      marcById.auth_user_id,
    );
    if (linkedErr) console.log("getUserById error:", linkedErr.message);
    else console.log("linked auth user:", { id: linked.user?.id, email: linked.user?.email });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
