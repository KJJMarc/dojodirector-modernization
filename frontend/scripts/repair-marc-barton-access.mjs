/**
 * Demote Marc Barton from platform Super Admin to KJJ admin with member/instructor access.
 *
 * Usage: node scripts/repair-marc-barton-access.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MARC_USER_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KJJ_KIDS_CLUB_ID = "0e81995e-7ed5-490d-8425-f23c87f34587";
const PRIMARY_SUPER_ADMIN_USER_ID = "e7c3a912-5d4b-4f81-9c2e-0a8b6d1f3e45";
const BACKUP_SUPER_ADMIN_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
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

async function countActiveSuperAdminUsers(excludeUserId = null) {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count Super Admin users: ${error.message}`);
  }

  const userIds = new Set((data ?? []).map((row) => row.user_id));

  if (excludeUserId) {
    userIds.delete(excludeUserId);
  }

  return userIds.size;
}

async function main() {
  const remainingSuperAdmins = await countActiveSuperAdminUsers(MARC_USER_ID);
  console.log(`Active Super Admin users excluding Marc: ${remainingSuperAdmins}`);

  if (remainingSuperAdmins < 2) {
    throw new Error(
      "Refusing to demote Marc: fewer than 2 other active Super Admin accounts.",
    );
  }

  const { data: primarySuperAdmin } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", PRIMARY_SUPER_ADMIN_USER_ID)
    .maybeSingle();

  const { data: backupSuperAdmin } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", BACKUP_SUPER_ADMIN_USER_ID)
    .maybeSingle();

  if (primarySuperAdmin?.email !== "marcabarton@hotmail.com") {
    throw new Error("Primary Super Admin account is missing or has unexpected email.");
  }

  if (backupSuperAdmin?.email !== "admin@kingstonjiujitsu.com") {
    throw new Error("Backup Super Admin account is missing or has unexpected email.");
  }

  const { data: kjjMembership, error: kjjLoadError } = await supabase
    .from("memberships")
    .select("id, role, status")
    .eq("user_id", MARC_USER_ID)
    .eq("club_id", KJJ_CLUB_ID)
    .maybeSingle();

  if (kjjLoadError) {
    throw new Error(`Failed to load KJJ membership: ${kjjLoadError.message}`);
  }

  if (!kjjMembership) {
    throw new Error("Marc has no Kingston Jiu Jitsu membership to update.");
  }

  const kjjUpdates = {};
  if (kjjMembership.role !== "admin") kjjUpdates.role = "admin";
  if (kjjMembership.status !== "active") kjjUpdates.status = "active";

  if (Object.keys(kjjUpdates).length > 0) {
    const { error } = await supabase
      .from("memberships")
      .update({ ...kjjUpdates, updated_at: new Date().toISOString() })
      .eq("id", kjjMembership.id);

    if (error) {
      throw new Error(`Failed to update KJJ membership: ${error.message}`);
    }

    console.log("Updated KJJ membership:", kjjUpdates);
  } else {
    console.log("KJJ membership already admin/active.");
  }

  const { data: kidsMembership, error: kidsLoadError } = await supabase
    .from("memberships")
    .select("id, role, status")
    .eq("user_id", MARC_USER_ID)
    .eq("club_id", KJJ_KIDS_CLUB_ID)
    .maybeSingle();

  if (kidsLoadError) {
    throw new Error(`Failed to load KJJ Kids membership: ${kidsLoadError.message}`);
  }

  if (kidsMembership) {
    const { error } = await supabase.from("memberships").delete().eq("id", kidsMembership.id);

    if (error) {
      throw new Error(`Failed to remove KJJ Kids membership: ${error.message}`);
    }

    console.log("Removed KJJ Kids membership for Marc.");
  } else {
    console.log("No KJJ Kids membership to remove.");
  }

  const { data: marcProfile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, email, auth_user_id, portal_auth_status, portal_login_email, instructor_portal_auth_status, instructor_portal_login_email",
    )
    .eq("id", MARC_USER_ID)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load Marc profile: ${profileError.message}`);
  }

  const profileUpdates = {
    updated_at: new Date().toISOString(),
  };

  if (!marcProfile?.instructor_portal_login_email?.trim()) {
    profileUpdates.instructor_portal_login_email = MARC_EMAIL;
  }

  if (marcProfile?.instructor_portal_auth_status !== "active") {
    profileUpdates.instructor_portal_auth_status = "active";
  }

  if (!marcProfile?.portal_login_email?.trim()) {
    profileUpdates.portal_login_email = MARC_EMAIL;
  }

  if (marcProfile?.portal_auth_status !== "active") {
    profileUpdates.portal_auth_status = "active";
  }

  if (Object.keys(profileUpdates).length > 1) {
    const { error } = await supabase
      .from("users")
      .update(profileUpdates)
      .eq("id", MARC_USER_ID);

    if (error) {
      throw new Error(`Failed to update Marc portal fields: ${error.message}`);
    }

    console.log("Updated Marc portal fields:", profileUpdates);
  } else {
    console.log("Marc portal fields already configured.");
  }

  const { data: programmeMembership, error: programmeError } = await supabase
    .from("programme_memberships")
    .select("id, status, programmes(name, slug)")
    .eq("user_id", MARC_USER_ID)
    .eq("status", "active");

  if (programmeError) {
    throw new Error(`Failed to load Marc programme memberships: ${programmeError.message}`);
  }

  console.log(
    "Active programme memberships preserved:",
    (programmeMembership ?? []).map((row) => {
      const programmes = Array.isArray(row.programmes) ? row.programmes[0] : row.programmes;
      return programmes?.name ?? row.id;
    }),
  );

  const { data: finalMemberships, error: finalMembershipsError } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(name, slug)")
    .eq("user_id", MARC_USER_ID);

  if (finalMembershipsError) {
    throw new Error(`Failed to load final memberships: ${finalMembershipsError.message}`);
  }

  console.log("\nMarc memberships after repair:");
  for (const row of finalMemberships ?? []) {
    const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    console.log(`- ${clubs?.name ?? row.club_id}: ${row.role} (${row.status})`);
  }

  const activeSuperAdminCount = await countActiveSuperAdminUsers();
  console.log(`\nActive Super Admin users after repair: ${activeSuperAdminCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
