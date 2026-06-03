#!/usr/bin/env node
/**
 * Verify programme student area vs booking access split.
 *
 * Usage (from frontend/):
 *   node scripts/verify-programme-access-split.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const PORTAL_TYPES = ["bjj", "muay_thai", "strength_conditioning"];

function loadEnv() {
  const envPath = path.join(FRONTEND_DIR, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2]
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifySharedDefaults() {
  const cases = [
    {
      source: "bjj",
      membership: ["bjj"],
      booking: PORTAL_TYPES,
    },
    {
      source: "muay_thai",
      membership: ["muay_thai"],
      booking: ["muay_thai"],
    },
    {
      source: "strength_conditioning",
      membership: ["strength_conditioning"],
      booking: ["strength_conditioning"],
    },
  ];

  for (const testCase of cases) {
    const membershipDefaults = buildDefaults(testCase.source, "membership");
    const bookingDefaults = buildDefaults(testCase.source, "booking");

    assert(
      JSON.stringify(membershipDefaults) === JSON.stringify(testCase.membership),
      `${testCase.source} student area defaults wrong: ${membershipDefaults.join(", ")}`,
    );
    assert(
      JSON.stringify(bookingDefaults) === JSON.stringify(testCase.booking),
      `${testCase.source} booking defaults wrong: ${bookingDefaults.join(", ")}`,
    );
  }

  console.log("PASS shared defaults for new student forms");
}

function buildDefaults(sourceProgrammeType, kind) {
  const source = PORTAL_TYPES.includes(sourceProgrammeType)
    ? sourceProgrammeType
    : "bjj";

  return PORTAL_TYPES.filter((programmeType) => {
    if (kind === "membership") {
      return programmeType === source;
    }

    return source === "bjj" ? true : programmeType === source;
  });
}

async function verifyDatabaseInvariants(supabase) {
  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type, club_id")
    .in("programme_type", PORTAL_TYPES);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const programmesById = new Map((programmes ?? []).map((row) => [row.id, row]));
  const programmesByTypeClub = new Map();

  for (const programme of programmes ?? []) {
    programmesByTypeClub.set(`${programme.club_id}:${programme.programme_type}`, programme);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("programme_memberships")
    .select("programme_id, user_id, status")
    .eq("status", "active");

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  let bookingAccessRows = [];
  const { data: bookingAccessData, error: bookingAccessError } = await supabase
    .from("programme_booking_access")
    .select("programme_id, user_id");

  if (bookingAccessError) {
    if (!bookingAccessError.message.toLowerCase().includes("programme_booking_access")) {
      throw new Error(bookingAccessError.message);
    }
  } else {
    bookingAccessRows = bookingAccessData ?? [];
  }

  const membershipUsersByTypeClub = new Map();
  const bookingUsersByTypeClub = new Map();

  for (const membership of memberships ?? []) {
    const programme = programmesById.get(membership.programme_id);
    if (!programme) {
      continue;
    }

    const key = `${programme.club_id}:${programme.programme_type}`;
    if (!membershipUsersByTypeClub.has(key)) {
      membershipUsersByTypeClub.set(key, new Set());
    }
    membershipUsersByTypeClub.get(key).add(membership.user_id);
  }

  for (const row of bookingAccessRows) {
    const programme = programmesById.get(row.programme_id);
    if (!programme) {
      continue;
    }

    const key = `${programme.club_id}:${programme.programme_type}`;
    if (!bookingUsersByTypeClub.has(key)) {
      bookingUsersByTypeClub.set(key, new Set());
    }
    bookingUsersByTypeClub.get(key).add(row.user_id);
  }

  let bookingWithoutMatchingMembership = 0;

  for (const row of bookingAccessRows) {
    const programme = programmesById.get(row.programme_id);
    if (!programme) {
      continue;
    }

    const membershipKey = `${programme.club_id}:${programme.programme_type}`;
    const membershipUsers = membershipUsersByTypeClub.get(membershipKey) ?? new Set();

    if (!membershipUsers.has(row.user_id)) {
      bookingWithoutMatchingMembership += 1;
    }
  }

  for (const programme of programmes ?? []) {
    const key = `${programme.club_id}:${programme.programme_type}`;
    const membershipCount = membershipUsersByTypeClub.get(key)?.size ?? 0;
    const bookingCount = bookingUsersByTypeClub.get(key)?.size ?? 0;

    console.log(
      `INFO ${programme.programme_type} club=${programme.club_id.slice(0, 8)}… student areas=${membershipCount} booking access=${bookingCount}`,
    );

    if (programme.programme_type === "muay_thai") {
      const bjjKey = `${programme.club_id}:bjj`;
      const bjjMembers = membershipUsersByTypeClub.get(bjjKey) ?? new Set();
      const mtMembers = membershipUsersByTypeClub.get(key) ?? new Set();

      for (const userId of mtMembers) {
        assert(
          !bjjMembers.has(userId) || mtMembers.has(userId),
          "Muay Thai list invariant failed",
        );
      }
    }
  }

  console.log(
    `PASS database invariants (${bookingWithoutMatchingMembership} booking rows without matching student area membership)`,
  );
}

async function main() {
  verifySharedDefaults();

  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.log("SKIP database checks (.env.local missing Supabase credentials)");
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await verifyDatabaseInvariants(supabase);
  console.log("\nAll programme access split checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
