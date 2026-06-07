#!/usr/bin/env node
/**
 * Verify BJJ students list scope includes staff with BJJ programme access.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-bjj-students-include-staff.mjs [search]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const BJJ_SLUG = "bjj";
const SEARCH = (process.argv[2] ?? "barton").trim().toLowerCase();

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

function matchesSearch(user) {
  const firstName = user.first_name?.toLowerCase() ?? "";
  const lastName = user.last_name?.toLowerCase() ?? "";
  const email = user.email?.toLowerCase() ?? "";
  return (
    firstName.includes(SEARCH) ||
    lastName.includes(SEARCH) ||
    email.includes(SEARCH)
  );
}

function formatRole(role) {
  if (!role) return "—";
  if (role === "super_admin") return "Super Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

async function main() {
  const { data: bjjProgramme, error: programmeError } = await supabase
    .from("programmes")
    .select("id, slug, programme_type")
    .eq("club_id", KJJ_CLUB_ID)
    .eq("slug", BJJ_SLUG)
    .maybeSingle();

  if (programmeError || !bjjProgramme) {
    throw new Error(`BJJ programme not found: ${programmeError?.message ?? "missing"}`);
  }

  const { data: programmeMemberships, error: membershipsError } = await supabase
    .from("programme_memberships")
    .select("user_id")
    .eq("programme_id", bjjProgramme.id);

  if (membershipsError) {
    throw new Error(`Failed to load programme memberships: ${membershipsError.message}`);
  }

  const programmeUserIds = new Set(
    (programmeMemberships ?? []).map((row) => row.user_id),
  );

  const { data: academyMemberships, error: academyError } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", KJJ_CLUB_ID);

  if (academyError) {
    throw new Error(`Failed to load academy memberships: ${academyError.message}`);
  }

  const scopedMemberships = (academyMemberships ?? []).filter((membership) =>
    programmeUserIds.has(membership.user_id),
  );

  const userIds = [...new Set(scopedMemberships.map((membership) => membership.user_id))];

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`);
  }

  const membershipByUserId = new Map(
    scopedMemberships.map((membership) => [membership.user_id, membership]),
  );

  const rows = (users ?? [])
    .map((user) => {
      const membership = membershipByUserId.get(user.id);
      return {
        name: [user.first_name, user.last_name].filter(Boolean).join(" "),
        email: user.email,
        role: formatRole(membership?.role ?? null),
        status: membership?.status ?? "—",
      };
    })
    .filter((row) => matchesSearch({ first_name: row.name.split(" ")[0], last_name: row.name.split(" ").slice(1).join(" "), email: row.email }));

  console.log(`BJJ programme members at Kingston Jiu Jitsu: ${scopedMemberships.length}`);
  console.log(`Search "${SEARCH}" matches: ${rows.length}`);
  for (const row of rows) {
    console.log(`- ${row.name} | ${row.role} | ${row.status} | ${row.email ?? "—"}`);
  }

  const staffMatches = rows.filter((row) => row.role !== "Student");
  if (staffMatches.length === 0) {
    console.error(
      `\nNo staff/admin/instructor matches for "${SEARCH}". Ensure they have BJJ programme membership.`,
    );
    process.exit(1);
  }

  console.log("\nOK — staff with BJJ programme access appear in programme-scoped list.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
