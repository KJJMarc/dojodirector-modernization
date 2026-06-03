#!/usr/bin/env node
/**
 * Verifies Kingston Jiu Jitsu Kids academy pages config and class separation.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-kjj-kids-amendments.mjs
 */

import { createClient } from "@supabase/supabase-js";

const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KJJ_SLUG = "kingston-jiu-jitsu";
const KIDS_SLUG = "kingston-jiu-jitsu-kids";

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

function getExpectedAcademyPageIds(clubSlug) {
  if (clubSlug === KIDS_SLUG) {
    return ["guest-bookings", "junior-belt-rankings"];
  }

  if (clubSlug === KJJ_SLUG) {
    return ["guest-bookings", "adult-belt-rankings"];
  }

  return ["guest-bookings"];
}

function checkAcademyPagesConfig() {
  const kjjPageIds = getExpectedAcademyPageIds(KJJ_SLUG);
  const kidsPageIds = getExpectedAcademyPageIds(KIDS_SLUG);

  assert(kjjPageIds.includes("guest-bookings"), "KJJ should list Guest Bookings.");
  assert(kjjPageIds.includes("adult-belt-rankings"), "KJJ should list Adult Belt Rankings.");
  assert(!kjjPageIds.includes("junior-belt-rankings"), "KJJ should not list Junior Belt Rankings.");

  assert(kidsPageIds.includes("guest-bookings"), "Kids should list Guest Bookings.");
  assert(kidsPageIds.includes("junior-belt-rankings"), "Kids should list Junior Belt Rankings.");
  assert(!kidsPageIds.includes("adult-belt-rankings"), "Kids should not list Adult Belt Rankings.");

  const kidsJuniorHref = `/${KIDS_SLUG}/junior-belt-rankings`;
  assert(
    kidsJuniorHref === `/${KIDS_SLUG}/junior-belt-rankings`,
    `Unexpected junior rankings href: ${kidsJuniorHref}`,
  );

  console.log("Academy Pages config checks passed.");
}

async function main() {
  checkAcademyPagesConfig();

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: kidsClub, error: kidsClubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (kidsClubError) {
    throw new Error(`Failed to load Kids club: ${kidsClubError.message}`);
  }

  assert(kidsClub, "Kingston Jiu Jitsu Kids club was not found.");

  const { count: kidsClassCount, error: kidsClassError } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("club_id", kidsClub.id);

  if (kidsClassError) {
    throw new Error(`Failed to count Kids classes: ${kidsClassError.message}`);
  }

  const { count: kjjClassCount, error: kjjClassError } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("club_id", KJJ_CLUB_ID);

  if (kjjClassError) {
    throw new Error(`Failed to count KJJ classes: ${kjjClassError.message}`);
  }

  assert((kidsClassCount ?? 0) > 0, "Expected Kids classes after timetable seed.");
  assert((kjjClassCount ?? 0) > 0, "Expected KJJ adult classes to remain present.");

  const { data: kidsClasses, error: kidsClassesListError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("club_id", kidsClub.id);

  if (kidsClassesListError) {
    throw new Error(`Failed to load Kids classes: ${kidsClassesListError.message}`);
  }

  for (const classRow of kidsClasses ?? []) {
    assert(
      /kids/i.test(classRow.name),
      `Kids class name should be Kids-specific: ${classRow.name}`,
    );
  }

  const kidsClassIds = (kidsClasses ?? []).map((row) => row.id);

  if (kidsClassIds.length > 0) {
    const { count: crossClubSessions, error: crossClubSessionsError } = await supabase
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .in("class_id", kidsClassIds)
      .neq("club_id", kidsClub.id);

    if (crossClubSessionsError) {
      throw new Error(
        `Failed to verify Kids session club scoping: ${crossClubSessionsError.message}`,
      );
    }

    assert(
      (crossClubSessions ?? 0) === 0,
      "Kids class sessions must belong to the Kids club only.",
    );
  }

  const { count: kidsSessions, error: kidsSessionsError } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", kidsClub.id)
    .eq("status", "scheduled");

  if (kidsSessionsError) {
    throw new Error(`Failed to count Kids sessions: ${kidsSessionsError.message}`);
  }

  console.log("Kingston Jiu Jitsu Kids amendments verification passed.");
  console.log(`Kids classes: ${kidsClassCount ?? 0}`);
  console.log(`Kids scheduled sessions: ${kidsSessions ?? 0}`);
  console.log(`KJJ classes unchanged count: ${kjjClassCount ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
