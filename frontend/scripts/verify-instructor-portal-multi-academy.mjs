#!/usr/bin/env node
/**
 * Verifies instructor portal multi-academy selector prerequisites and data separation.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-instructor-portal-multi-academy.mjs
 */

import { createClient } from "@supabase/supabase-js";

const MARC_USER_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KJJ_SLUG = "kingston-jiu-jitsu";
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const INSTRUCTOR_ROLES = new Set(["instructor", "admin", "super_admin"]);

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

function isKidsClassName(name) {
  return /kids/i.test(name ?? "");
}

async function loadUpcomingSessionClassNames(supabase, clubId) {
  const now = new Date().toISOString();
  const end = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, classes(name)")
    .eq("club_id", clubId)
    .gte("starts_at", now)
    .lte("starts_at", end)
    .limit(200);

  if (error) {
    throw new Error(`Failed to load sessions for club ${clubId}: ${error.message}`);
  }

  return (data ?? []).map((row) => row.classes?.name ?? "(unknown)");
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log("=== Marc Barton instructor portal memberships ===");

  const { data: marc, error: marcError } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, instructor_portal_auth_status, instructor_portal_login_email, auth_user_id",
    )
    .eq("id", MARC_USER_ID)
    .maybeSingle();

  if (marcError) {
    throw new Error(`Failed to load Marc Barton: ${marcError.message}`);
  }

  assert(marc, "Marc Barton user record not found.");
  assert(
    ["active", "invited"].includes(marc.instructor_portal_auth_status ?? ""),
    `Marc instructor portal auth status must be active or invited (got ${marc.instructor_portal_auth_status}).`,
  );
  assert(marc.auth_user_id, "Marc must be linked to an auth user for portal login.");

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(id, name, slug, is_active)")
    .eq("user_id", MARC_USER_ID)
    .eq("status", "active");

  if (membershipError) {
    throw new Error(`Failed to load Marc memberships: ${membershipError.message}`);
  }

  const instructorMemberships = (memberships ?? []).filter((row) =>
    INSTRUCTOR_ROLES.has(row.role ?? ""),
  );

  console.log(
    "Instructor memberships:",
    instructorMemberships.map((row) => ({
      club: row.clubs?.name ?? row.club_id,
      slug: row.clubs?.slug ?? null,
      role: row.role,
    })),
  );

  assert(
    instructorMemberships.length >= 2,
    `Marc should have instructor access to at least 2 academies (found ${instructorMemberships.length}).`,
  );

  const accessibleSlugs = instructorMemberships
    .map((row) => row.clubs?.slug)
    .filter(Boolean)
    .sort();

  assert(
    accessibleSlugs.includes(KJJ_SLUG),
    `Marc should have access to ${KJJ_SLUG}.`,
  );
  assert(
    accessibleSlugs.includes(KIDS_SLUG),
    `Marc should have access to ${KIDS_SLUG}.`,
  );

  console.log("Marc can access both academies:", accessibleSlugs.join(", "));

  console.log("\n=== Club lookup ===");

  const { data: kidsClub, error: kidsClubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (kidsClubError) {
    throw new Error(`Failed to load Kids club: ${kidsClubError.message}`);
  }

  assert(kidsClub, "Kingston Jiu Jitsu Kids club not found.");

  console.log("KJJ club id:", KJJ_CLUB_ID);
  console.log("Kids club id:", kidsClub.id);

  console.log("\n=== Attendance Register / Session Cover session separation ===");

  const [kjjSessionNames, kidsSessionNames] = await Promise.all([
    loadUpcomingSessionClassNames(supabase, KJJ_CLUB_ID),
    loadUpcomingSessionClassNames(supabase, kidsClub.id),
  ]);

  console.log(`KJJ upcoming sessions: ${kjjSessionNames.length}`);
  console.log(`Kids upcoming sessions: ${kidsSessionNames.length}`);

  assert(kjjSessionNames.length > 0, "KJJ should have upcoming sessions for portal scoping checks.");
  assert(kidsSessionNames.length > 0, "Kids should have upcoming sessions for portal scoping checks.");

  const kjjKidsNames = kjjSessionNames.filter(isKidsClassName);
  const kidsAdultNames = kidsSessionNames.filter((name) => !isKidsClassName(name));

  assert(
    kjjKidsNames.length === 0,
    `KJJ portal must not include Kids classes. Found: ${kjjKidsNames.join(", ")}`,
  );
  assert(
    kidsAdultNames.length === 0,
    `Kids portal must not include adult academy classes. Found: ${kidsAdultNames.join(", ")}`,
  );

  console.log("\n=== My Classes recurring schedule separation ===");

  const { data: kjjSchedules, error: kjjScheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id, classes(name)")
    .eq("club_id", KJJ_CLUB_ID);

  if (kjjScheduleError) {
    throw new Error(`Failed to load KJJ schedules: ${kjjScheduleError.message}`);
  }

  const { data: kidsSchedules, error: kidsScheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id, classes(name)")
    .eq("club_id", kidsClub.id);

  if (kidsScheduleError) {
    throw new Error(`Failed to load Kids schedules: ${kidsScheduleError.message}`);
  }

  const kjjScheduleKidsNames = (kjjSchedules ?? [])
    .map((row) => row.classes?.name ?? "")
    .filter(isKidsClassName);
  const kidsScheduleAdultNames = (kidsSchedules ?? [])
    .map((row) => row.classes?.name ?? "")
    .filter((name) => name && !isKidsClassName(name));

  assert(
    kjjScheduleKidsNames.length === 0,
    `KJJ recurring schedules must not include Kids classes. Found: ${kjjScheduleKidsNames.join(", ")}`,
  );
  assert(
    kidsScheduleAdultNames.length === 0,
    `Kids recurring schedules must only include Kids classes. Found: ${kidsScheduleAdultNames.join(", ")}`,
  );

  console.log(`KJJ recurring schedules: ${(kjjSchedules ?? []).length}`);
  console.log(`Kids recurring schedules: ${(kidsSchedules ?? []).length}`);

  console.log("\n=== Route / cookie expectations ===");
  console.log("- Selector route: /instructor-portal (when 2+ clubs and no cookie)");
  console.log("- Cookie name: instructor_portal_club_slug");
  console.log("- Attendance register: /attendance?from=instructor-portal&club=<slug>");
  console.log("- Session cover: /instructor/<slug>/session-cover (club from cookie)");
  console.log("- My Classes: /instructor/<slug>/my-classes (club from cookie)");
  console.log("- Messages: /instructor-portal/messages (club from cookie)");

  console.log("\nAll instructor portal multi-academy checks passed.");
}

main().catch((error) => {
  console.error("\nVerification failed:", error.message);
  process.exit(1);
});
