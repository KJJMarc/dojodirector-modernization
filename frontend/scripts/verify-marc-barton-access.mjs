/**
 * Verify Marc Barton access cleanup and Super Admin separation.
 *
 * Usage: node scripts/verify-marc-barton-access.mjs
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
const INSTRUCTOR_ROLES = ["instructor", "admin", "super_admin"];
const CLUB_ADMIN_ROLES = ["admin", "owner"];

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadMembership(userId, clubId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function userHasSuperAdminAccess(userId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .eq("status", "active")
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

async function loadActiveProgrammeMemberUserIdsForClub(clubId) {
  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const programmeIds = (programmes ?? []).map((programme) => programme.id);

  if (programmeIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("programme_memberships")
    .select("user_id")
    .in("programme_id", programmeIds)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.user_id));
}

async function main() {
  console.log("=== Marc Barton access verification ===\n");

  const { data: marc, error: marcError } = await supabase
    .from("users")
    .select(
      "id, email, auth_user_id, portal_auth_status, portal_login_email, instructor_portal_auth_status, instructor_portal_login_email",
    )
    .eq("id", MARC_USER_ID)
    .maybeSingle();

  if (marcError) {
    throw new Error(marcError.message);
  }

  assert(marc, "Marc profile not found.");
  assert(marc.email === "marc@jiujitsubrotherhood.com", "Unexpected Marc email.");
  assert(marc.auth_user_id, "Marc must remain linked to auth user.");

  const kjjMembership = await loadMembership(MARC_USER_ID, KJJ_CLUB_ID);
  const kidsMembership = await loadMembership(MARC_USER_ID, KJJ_KIDS_CLUB_ID);

  assert(kjjMembership, "Marc must retain Kingston Jiu Jitsu membership.");
  assert(kjjMembership.role === "admin", "Marc KJJ role must be admin.");
  assert(kjjMembership.status === "active", "Marc KJJ membership must be active.");
  assert(!kidsMembership, "Marc must not retain a Kingston Jiu Jitsu Kids membership.");

  assert(!(await userHasSuperAdminAccess(MARC_USER_ID)), "Marc must not have Super Admin access.");

  const activeProgrammeMembers = await loadActiveProgrammeMemberUserIdsForClub(KJJ_CLUB_ID);
  assert(
    activeProgrammeMembers.has(MARC_USER_ID),
    "Marc must remain an active programme member at Kingston Jiu Jitsu.",
  );

  const { data: instructorMemberships, error: instructorError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("club_id", KJJ_CLUB_ID)
    .in("role", INSTRUCTOR_ROLES)
    .eq("status", "active")
    .eq("user_id", MARC_USER_ID);

  if (instructorError) {
    throw new Error(instructorError.message);
  }

  assert(
    (instructorMemberships ?? []).length === 1,
    "Marc must appear in instructor workflow membership queries at KJJ.",
  );

  const { data: studentMemberships, error: studentError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", KJJ_CLUB_ID)
    .eq("role", "student")
    .eq("status", "active")
    .eq("user_id", MARC_USER_ID);

  if (studentError) {
    throw new Error(studentError.message);
  }

  assert(
    (studentMemberships ?? []).length === 0,
    "Marc should not rely on a separate student club membership row.",
  );

  assert(
    CLUB_ADMIN_ROLES.includes(kjjMembership.role),
    "Marc must retain Kingston Jiu Jitsu admin dashboard access.",
  );
  assert(
    ["active", "invited"].includes(marc.instructor_portal_auth_status ?? ""),
    "Marc must retain instructor portal auth status.",
  );
  assert(
    activeProgrammeMembers.has(MARC_USER_ID) && kjjMembership.status === "active",
    "Marc must retain student portal access via active member profile.",
  );

  const { count: gradeAwardCount, error: gradeAwardError } = await supabase
    .from("grade_awards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", MARC_USER_ID);

  if (gradeAwardError) {
    throw new Error(gradeAwardError.message);
  }

  assert((gradeAwardCount ?? 0) > 0, "Marc grade award history must be preserved.");

  const { count: attendanceCount, error: attendanceError } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("user_id", MARC_USER_ID);

  if (attendanceError) {
    throw new Error(attendanceError.message);
  }

  assert((attendanceCount ?? 0) > 0, "Marc attendance history must be preserved.");

  assert(
    await userHasSuperAdminAccess(PRIMARY_SUPER_ADMIN_USER_ID),
    "Primary Super Admin must retain /super-admin access.",
  );
  assert(
    await userHasSuperAdminAccess(BACKUP_SUPER_ADMIN_USER_ID),
    "Backup Super Admin must retain /super-admin access.",
  );

  const { data: superAdmins, error: superAdminError } = await supabase
    .from("memberships")
    .select("user_id, clubs(name), users(email, first_name, last_name)")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (superAdminError) {
    throw new Error(superAdminError.message);
  }

  const byUser = new Map();
  for (const row of superAdmins ?? []) {
    const users = Array.isArray(row.users) ? row.users[0] : row.users;
    const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    const existing = byUser.get(row.user_id) ?? {
      email: users?.email ?? null,
      name: users ? `${users.first_name ?? ""} ${users.last_name ?? ""}`.trim() : row.user_id,
      clubs: [],
    };
    existing.clubs.push(clubs?.name ?? "unknown");
    byUser.set(row.user_id, existing);
  }

  assert(byUser.size >= 2, "At least two active Super Admin accounts must remain.");
  assert(!byUser.has(MARC_USER_ID), "Marc must not remain in active Super Admin set.");

  console.log("Marc KJJ membership: admin/active");
  console.log("Marc KJJ Kids membership: none");
  console.log("Marc Super Admin access: none");
  console.log("Marc programme member profile: active");
  console.log("Marc instructor workflow membership: present");
  console.log("Marc admin dashboard access: present");
  console.log("Marc student portal access: present via member profile");
  console.log("Marc instructor portal access: present");
  console.log(`Marc grade awards preserved: ${gradeAwardCount}`);
  console.log(`Marc attendance records preserved: ${attendanceCount}`);
  console.log("\nActive Super Admin accounts:");
  for (const [userId, entry] of byUser.entries()) {
    console.log(`- ${entry.name} (${entry.email})`);
    console.log(`  user_id: ${userId}`);
    console.log(`  clubs: ${entry.clubs.join(", ")}`);
  }
  console.log(`\nTotal active Super Admin count: ${byUser.size}`);
  console.log("\nAll checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
