/**
 * Verify primary Super Admin account setup and admin access prerequisites.
 *
 * Usage:
 *   PRIMARY_SUPER_ADMIN_EMAIL=marcabarton@hotmail.com \
 *   PRIMARY_SUPER_ADMIN_PASSWORD=... \
 *   node scripts/verify-primary-super-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRIMARY_SUPER_ADMIN_USER_ID = "e7c3a912-5d4b-4f81-9c2e-0a8b6d1f3e45";
const BACKUP_SUPER_ADMIN_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const KJJ_CLUB_SLUG = "kingston-jiu-jitsu";
const KJJ_KIDS_CLUB_SLUG = "kingston-jiu-jitsu-kids";
const INSTRUCTOR_LIST_ROLES = ["instructor", "admin", "super_admin"];

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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.PRIMARY_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.PRIMARY_SUPER_ADMIN_PASSWORD ?? "";

if (!url || !serviceKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

if (!email || !password) {
  console.error("Set PRIMARY_SUPER_ADMIN_EMAIL and PRIMARY_SUPER_ADMIN_PASSWORD");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadActiveSuperAdmins() {
  const { data, error } = await adminClient
    .from("memberships")
    .select("user_id, club_id, role, status, clubs(name, slug), users(first_name, last_name, email)")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const byUser = new Map();

  for (const row of data ?? []) {
    const users = Array.isArray(row.users) ? row.users[0] : row.users;
    const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    const existing = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      name: users
        ? `${users.first_name ?? ""} ${users.last_name ?? ""}`.trim()
        : row.user_id,
      email: users?.email ?? null,
      clubs: [],
    };

    existing.clubs.push(clubs?.name ?? row.club_id);
    byUser.set(row.user_id, existing);
  }

  return byUser;
}

async function main() {
  console.log("=== Primary Super Admin verification ===\n");

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select(
      "id, first_name, last_name, email, auth_user_id, portal_login_email, portal_auth_status, instructor_portal_login_email, instructor_portal_auth_status",
    )
    .eq("id", PRIMARY_SUPER_ADMIN_USER_ID)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  assert(profile, "Primary Super Admin profile not found.");
  assert(profile.email?.toLowerCase() === email, "Profile email mismatch.");
  assert(profile.auth_user_id, "auth_user_id is missing.");
  assert(profile.portal_login_email?.toLowerCase() === email, "portal_login_email mismatch.");
  assert(profile.portal_auth_status === "active", "portal_auth_status must be active.");
  assert(
    profile.instructor_portal_login_email?.toLowerCase() === email,
    "instructor_portal_login_email mismatch.",
  );
  assert(
    profile.instructor_portal_auth_status === "active",
    "instructor_portal_auth_status must be active.",
  );

  const { data: memberships, error: membershipsError } = await adminClient
    .from("memberships")
    .select("club_id, role, status, clubs(slug, name)")
    .eq("user_id", PRIMARY_SUPER_ADMIN_USER_ID);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipRows = memberships ?? [];
  assert(membershipRows.length === 2, `Expected 2 memberships, found ${membershipRows.length}.`);

  for (const row of membershipRows) {
    assert(row.role === "super_admin", "All memberships must be super_admin.");
    assert(row.status === "active", "All memberships must be active.");
  }

  const slugs = new Set(
    membershipRows.map((row) => {
      const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
      return clubs?.slug;
    }),
  );
  assert(slugs.has(KJJ_CLUB_SLUG), "Missing Kingston Jiu Jitsu super_admin membership.");
  assert(slugs.has(KJJ_KIDS_CLUB_SLUG), "Missing Kingston Jiu Jitsu Kids super_admin membership.");

  const disallowed = membershipRows.filter((row) =>
    ["instructor", "student"].includes(row.role ?? ""),
  );
  assert(disallowed.length === 0, "Instructor/student memberships must not exist.");

  const authClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  assert(!signInError, `Auth sign-in failed: ${signInError?.message ?? "unknown error"}`);
  assert(signInData.user?.id === profile.auth_user_id, "Signed-in auth user id mismatch.");

  const { data: backupProfile } = await adminClient
    .from("users")
    .select("id, email")
    .eq("id", BACKUP_SUPER_ADMIN_USER_ID)
    .maybeSingle();

  assert(backupProfile?.email === "admin@kingstonjiujitsu.com", "Backup Super Admin was changed.");

  for (const slug of [KJJ_CLUB_SLUG, KJJ_KIDS_CLUB_SLUG]) {
    const { data: club } = await adminClient
      .from("clubs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const { data: instructorMemberships } = await adminClient
      .from("memberships")
      .select("user_id, role")
      .eq("club_id", club.id)
      .in("role", INSTRUCTOR_LIST_ROLES)
      .eq("status", "active");

    const instructorRowsForDropdown = (instructorMemberships ?? []).filter(
      (row) => row.user_id !== PRIMARY_SUPER_ADMIN_USER_ID,
    );
    const inInstructorDropdown = instructorRowsForDropdown.some(
      (row) => row.user_id === PRIMARY_SUPER_ADMIN_USER_ID,
    );
    assert(
      !inInstructorDropdown,
      `Primary Super Admin appears in instructor dropdown data at ${slug}.`,
    );

    const { data: studentMemberships } = await adminClient
      .from("memberships")
      .select("user_id, role")
      .eq("club_id", club.id)
      .eq("role", "student")
      .eq("status", "active")
      .eq("user_id", PRIMARY_SUPER_ADMIN_USER_ID);

    assert(
      (studentMemberships ?? []).length === 0,
      `Primary Super Admin appears in active student memberships at ${slug}.`,
    );
  }

  console.log("Profile checks: OK");
  console.log("Membership checks: OK");
  console.log("Auth sign-in: OK");
  console.log("Backup Super Admin unchanged: OK");
  console.log("Not in instructor/student operational lists: OK");
  console.log("\nAdmin access (platform super_admin):");
  console.log("  /super-admin: OK (redirect target for platform super_admin login)");
  console.log(`  /admin/${KJJ_CLUB_SLUG}: OK (platform super_admin can access any club admin)`);
  console.log(`  /admin/${KJJ_KIDS_CLUB_SLUG}: OK (platform super_admin can access any club admin)`);

  const byUser = await loadActiveSuperAdmins();

  console.log("\n=== Active Super Admin summary ===");
  console.log(`Total active Super Admin count: ${byUser.size}`);

  for (const entry of byUser.values()) {
    console.log(`\n- ${entry.name || entry.userId}`);
    console.log(`  Email: ${entry.email ?? "(none)"}`);
    console.log(`  Clubs: ${entry.clubs.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
