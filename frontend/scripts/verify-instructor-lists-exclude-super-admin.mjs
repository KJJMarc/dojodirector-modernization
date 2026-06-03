/**
 * Verify Super Admin accounts are excluded from academy instructor list queries.
 *
 * Usage: node scripts/verify-instructor-lists-exclude-super-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACADEMY_INSTRUCTOR_LIST_ROLES = ["instructor", "admin"];
const PRIMARY_SUPER_ADMIN_USER_ID = "e7c3a912-5d4b-4f81-9c2e-0a8b6d1f3e45";
const BACKUP_SUPER_ADMIN_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const EXPECTED_INSTRUCTORS = {
  "kingston-jiu-jitsu": ["Ray Stokes", "Charlemagne Villaroman"],
  "kingston-jiu-jitsu-kids": ["Ray Stokes", "Charlemagne Villaroman", "Brendan van Rooyen"],
};

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

async function loadInstructorListForClub(clubId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, users(first_name, last_name, email)")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ACADEMY_INSTRUCTOR_LIST_ROLES);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const users = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      userId: row.user_id,
      role: row.role,
      name: `${users?.first_name ?? ""} ${users?.last_name ?? ""}`.trim(),
      email: users?.email ?? null,
    };
  });
}

async function main() {
  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .order("name");

  if (clubsError) {
    throw new Error(clubsError.message);
  }

  for (const club of clubs ?? []) {
    console.log(`\n=== ${club.name} (${club.slug}) ===`);
    const instructors = await loadInstructorListForClub(club.id);
    console.log(`Instructor list count: ${instructors.length}`);

    for (const instructor of instructors) {
      console.log(`- ${instructor.name} (${instructor.role})`);
    }

    const instructorIds = new Set(instructors.map((row) => row.userId));
    assert(
      !instructorIds.has(PRIMARY_SUPER_ADMIN_USER_ID),
      `Primary Super Admin must not appear in instructor list at ${club.slug}.`,
    );
    assert(
      !instructorIds.has(BACKUP_SUPER_ADMIN_USER_ID),
      `Backup Super Admin must not appear in instructor list at ${club.slug}.`,
    );

    for (const expectedName of EXPECTED_INSTRUCTORS[club.slug] ?? []) {
      assert(
        instructors.some((row) => row.name === expectedName),
        `Expected instructor ${expectedName} at ${club.slug}.`,
      );
    }
  }

  const { data: superAdmins, error: superAdminError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (superAdminError) {
    throw new Error(superAdminError.message);
  }

  const superAdminIds = new Set((superAdmins ?? []).map((row) => row.user_id));
  assert(superAdminIds.has(PRIMARY_SUPER_ADMIN_USER_ID), "Primary Super Admin access must remain.");
  assert(superAdminIds.has(BACKUP_SUPER_ADMIN_USER_ID), "Backup Super Admin access must remain.");

  console.log("\nAll instructor list checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
