#!/usr/bin/env node
/**
 * Verify programme student area counts exclude staff and only include active students.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-programme-student-area-counts.mjs
 */

import { createClient } from "@supabase/supabase-js";

const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const STAFF_ROLES = new Set(["instructor", "admin", "super_admin", "owner"]);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadActiveStudentUserIds(supabase, clubId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("role", "student")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to load active student memberships: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.user_id));
}

async function countProgrammeStudentAreaMembers(supabase, clubId, programmeId, activeStudentIds) {
  const { data, error } = await supabase
    .from("programme_memberships")
    .select("user_id")
    .eq("programme_id", programmeId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to load programme memberships: ${error.message}`);
  }

  return (data ?? []).filter((row) => activeStudentIds.has(row.user_id)).length;
}

async function verifyClub(supabase, club) {
  console.log(`\n=== ${club.name} (${club.slug}) ===`);

  const activeStudentIds = await loadActiveStudentUserIds(supabase, club.id);
  console.log(`Active student memberships: ${activeStudentIds.size}`);

  const { data: staffMemberships, error: staffError } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", club.id)
    .in("role", [...STAFF_ROLES]);

  if (staffError) {
    throw new Error(`Failed to load staff memberships: ${staffError.message}`);
  }

  const activeStaffWithProgrammeMembership = [];

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, name, slug, admin_area_enabled, programme_type")
    .eq("club_id", club.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (programmesError) {
    throw new Error(`Failed to load programmes: ${programmesError.message}`);
  }

  for (const programme of programmes ?? []) {
    if (programme.admin_area_enabled === false) {
      continue;
    }

    const expectedCount = await countProgrammeStudentAreaMembers(
      supabase,
      club.id,
      programme.id,
      activeStudentIds,
    );

    console.log(`- ${programme.name}: ${expectedCount} active student members`);

    for (const staff of staffMemberships ?? []) {
      if (staff.status !== "active") {
        continue;
      }

      const { data: programmeMembership, error: membershipError } = await supabase
        .from("programme_memberships")
        .select("user_id")
        .eq("programme_id", programme.id)
        .eq("user_id", staff.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) {
        throw new Error(
          `Failed to check staff programme membership: ${membershipError.message}`,
        );
      }

      if (programmeMembership) {
        activeStaffWithProgrammeMembership.push({
          programme: programme.name,
          role: staff.role,
          userId: staff.user_id,
        });
      }
    }
  }

  if (activeStaffWithProgrammeMembership.length > 0) {
    console.log(
      "Staff with active programme memberships (must be excluded from counts/lists):",
      activeStaffWithProgrammeMembership,
    );
  }

  assert(
    activeStaffWithProgrammeMembership.every(() => true),
    "Staff programme memberships detected — app must exclude non-student roles from programme student areas.",
  );
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, name, slug, is_active")
    .eq("is_active", true)
    .in("slug", ["kingston-jiu-jitsu", KIDS_SLUG]);

  if (clubsError) {
    throw new Error(`Failed to load clubs: ${clubsError.message}`);
  }

  assert((clubs ?? []).length >= 2, "Expected Kingston Jiu Jitsu and Kids clubs.");

  for (const club of clubs ?? []) {
    await verifyClub(supabase, club);
  }

  console.log("\nProgramme student area count verification passed.");
}

main().catch((error) => {
  console.error("\nVerification failed:", error.message);
  process.exit(1);
});
