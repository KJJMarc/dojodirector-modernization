/**
 * Repair Marc Barton instructor portal access (no password changes).
 * Usage: node scripts/repair-marc-barton-instructor.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARC_USER_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const MARC_AUTH_USER_ID = "b465336d-77e0-417f-9c3d-2affc85174d3";
const MARC_EMAIL = "marc@jiujitsubrotherhood.com";

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
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: before } = await supabase
    .from("users")
    .select(
      "id, email, auth_user_id, instructor_portal_auth_status, instructor_portal_login_email",
    )
    .eq("id", MARC_USER_ID)
    .single();

  console.log("Before:", before);

  const { data: memBefore } = await supabase
    .from("memberships")
    .select("id, role, status")
    .eq("user_id", MARC_USER_ID)
    .eq("club_id", KJJ_CLUB_ID)
    .maybeSingle();

  console.log("Membership before:", memBefore);

  const memUpdates = {};
  if (memBefore?.role !== "super_admin") memUpdates.role = "super_admin";
  if (memBefore?.status !== "active") memUpdates.status = "active";

  if (Object.keys(memUpdates).length > 0) {
    const { error } = await supabase
      .from("memberships")
      .update({ ...memUpdates, updated_at: new Date().toISOString() })
      .eq("user_id", MARC_USER_ID)
      .eq("club_id", KJJ_CLUB_ID);
    if (error) throw error;
    console.log("Membership updated:", memUpdates);
  } else {
    console.log("Membership unchanged (already super_admin/active).");
  }

  const userUpdates = {
    instructor_portal_auth_status: "active",
    instructor_portal_login_email:
      before?.instructor_portal_login_email?.trim() || before?.email || MARC_EMAIL,
    instructor_portal_invited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!before?.auth_user_id) {
    userUpdates.auth_user_id = MARC_AUTH_USER_ID;
  }

  const needsUserUpdate =
    before?.instructor_portal_auth_status !== "active" ||
    !before?.instructor_portal_login_email?.trim();

  if (needsUserUpdate || !before?.auth_user_id) {
    const { error } = await supabase
      .from("users")
      .update(userUpdates)
      .eq("id", MARC_USER_ID);
    if (error) throw error;
    console.log("User updated:", {
      instructor_portal_auth_status: userUpdates.instructor_portal_auth_status,
      instructor_portal_login_email: userUpdates.instructor_portal_login_email,
      auth_user_id: userUpdates.auth_user_id ?? "(unchanged)",
    });
  } else {
    console.log("User instructor portal fields already active.");
  }

  const { data: after } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, auth_user_id, portal_auth_status, instructor_portal_auth_status, instructor_portal_login_email",
    )
    .eq("id", MARC_USER_ID)
    .single();

  const { data: memAfter } = await supabase
    .from("memberships")
    .select("id, user_id, club_id, role, status, joined_at")
    .eq("user_id", MARC_USER_ID)
    .eq("club_id", KJJ_CLUB_ID)
    .single();

  console.log("\nAfter user:", after);
  console.log("After membership:", memAfter);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
