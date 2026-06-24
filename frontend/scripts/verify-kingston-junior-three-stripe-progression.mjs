#!/usr/bin/env node
/**
 * Verifies Kingston junior belts use 3 stripes while Bahamas keeps 4.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-kingston-junior-three-stripe-progression.mjs
 */

import { createClient } from "@supabase/supabase-js";

const KINGSTON_SLUGS = ["kingston-jiu-jitsu", "kingston-jiu-jitsu-kids"];
const BAHAMAS_SLUG = "bahamas-jiu-jitsu";
const KINGSTON_ACTIVE_JUNIOR_BELT_COUNT = 52;
const KINGSTON_JUNIOR_REQUIREMENT_MIN = 51;

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

async function loadClubId(supabase, slug) {
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club ${slug}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Club not found: ${slug}`);
  }

  return data;
}

async function loadJuniorBelts(supabase, clubId) {
  const extended = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, belt_category, is_active")
    .eq("club_id", clubId)
    .eq("belt_category", "junior")
    .order("sort_order", { ascending: true });

  if (!extended.error) {
    return extended.data ?? [];
  }

  if (!extended.error.message.includes("is_active")) {
    throw new Error(`Failed to load junior belts for ${clubId}: ${extended.error.message}`);
  }

  const fallback = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, belt_category")
    .eq("club_id", clubId)
    .eq("belt_category", "junior")
    .order("sort_order", { ascending: true });

  if (fallback.error) {
    throw new Error(`Failed to load junior belts for ${clubId}: ${fallback.error.message}`);
  }

  return (fallback.data ?? []).map((belt) => ({ ...belt, is_active: true }));
}

async function loadJuniorRequirementsForClub(supabase, beltIds) {
  if (beltIds.length === 0) {
    return [];
  }

  const fromToResult = await supabase
    .from("junior_grading_requirements")
    .select("id, from_belt_level_id, to_belt_level_id, required_attendance, required_weeks")
    .in("from_belt_level_id", beltIds);

  if (!fromToResult.error) {
    return fromToResult.data ?? [];
  }

  if (
    !fromToResult.error.message.includes("from_belt_level_id") &&
    !fromToResult.error.message.includes("to_belt_level_id")
  ) {
    throw new Error(
      `Failed to load junior grading requirements: ${fromToResult.error.message}`,
    );
  }

  const targetResult = await supabase
    .from("junior_grading_requirements")
    .select("id, belt_level_id, minimum_attendances, required_weeks")
    .in("belt_level_id", beltIds);

  if (targetResult.error) {
    throw new Error(
      `Failed to load junior grading requirements: ${targetResult.error.message}`,
    );
  }

  return targetResult.data ?? [];
}

function isActiveBelt(belt) {
  return belt.is_active !== false;
}

async function verifyKingstonClub(supabase, club) {
  const belts = await loadJuniorBelts(supabase, club.id);
  const activeBelts = belts.filter(isActiveBelt);
  const activeFourStripe = activeBelts.filter((belt) => belt.stripe_count === 4);
  const activeThreeStripe = activeBelts.filter((belt) => belt.stripe_count === 3);
  const retiredFourStripe = belts.filter(
    (belt) => belt.stripe_count === 4 && belt.is_active === false,
  );
  const removedFourStripe = belts.filter((belt) => belt.stripe_count === 4);

  assert(
    activeFourStripe.length === 0,
    `${club.slug} should have no active junior 4 Stripe belts (found ${activeFourStripe.length}).`,
  );
  assert(
    activeBelts.length === KINGSTON_ACTIVE_JUNIOR_BELT_COUNT,
    `${club.slug} should have ${KINGSTON_ACTIVE_JUNIOR_BELT_COUNT} active junior belts (found ${activeBelts.length}).`,
  );
  assert(
    activeThreeStripe.length === 13,
    `${club.slug} should have 13 active junior 3 Stripe belts.`,
  );

  if (belts.some((belt) => Object.prototype.hasOwnProperty.call(belt, "is_active"))) {
    assert(
      retiredFourStripe.length === 13,
      `${club.slug} should have 13 retired junior 4 Stripe belts after migration.`,
    );
  } else {
    assert(
      removedFourStripe.length === 0,
      `${club.slug} should have no junior 4 Stripe belt rows after migration.`,
    );
  }

  const beltById = new Map(belts.map((belt) => [belt.id, belt]));
  const requirements = await loadJuniorRequirementsForClub(
    supabase,
    belts.map((belt) => belt.id),
  );

  for (const requirement of requirements) {
    if ("from_belt_level_id" in requirement && requirement.from_belt_level_id) {
      const fromBelt = beltById.get(requirement.from_belt_level_id);
      const toBelt = beltById.get(requirement.to_belt_level_id);

      assert(fromBelt, `${club.slug} requirement references missing from belt.`);
      assert(toBelt, `${club.slug} requirement references missing to belt.`);

      if (fromBelt.stripe_count === 3) {
        assert(
          toBelt.stripe_count === 0,
          `${club.slug} ${fromBelt.name} should promote to next base belt, not ${toBelt.name}.`,
        );
      }

      assert(
        fromBelt.stripe_count !== 4 && toBelt.stripe_count !== 4,
        `${club.slug} should not have requirements involving 4 Stripe belts.`,
      );
    }
  }

  assert(
    requirements.length >= KINGSTON_JUNIOR_REQUIREMENT_MIN,
    `${club.slug} should have at least ${KINGSTON_JUNIOR_REQUIREMENT_MIN} junior requirements.`,
  );

  console.log(`OK ${club.name}: ${activeBelts.length} active junior belts, 0 active 4 Stripe rows.`);
}

async function verifyBahamasClub(supabase, club) {
  const belts = await loadJuniorBelts(supabase, club.id);
  const activeFourStripe = belts.filter(
    (belt) => isActiveBelt(belt) && belt.stripe_count === 4,
  );

  assert(
    activeFourStripe.length === 13,
    `${club.slug} should still have 13 active junior 4 Stripe belts (found ${activeFourStripe.length}).`,
  );

  console.log(`OK ${club.name}: ${activeFourStripe.length} active junior 4 Stripe belts preserved.`);
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  for (const slug of KINGSTON_SLUGS) {
    const club = await loadClubId(supabase, slug);
    await verifyKingstonClub(supabase, club);
  }

  const bahamasClub = await loadClubId(supabase, BAHAMAS_SLUG);
  await verifyBahamasClub(supabase, bahamasClub);

  console.log("Kingston junior three-stripe progression verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
