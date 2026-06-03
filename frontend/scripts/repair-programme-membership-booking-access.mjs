#!/usr/bin/env node
/**
 * Repair programme student area membership vs portal booking access.
 *
 * Does NOT use repair-bjj-programme-memberships.sql.
 *
 * Usage (from frontend/):
 *   node scripts/repair-programme-membership-booking-access.mjs --dry-run
 *   node scripts/repair-programme-membership-booking-access.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const PORTAL_PROGRAMME_TYPES = ["bjj", "muay_thai", "strength_conditioning"];

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

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function formatUser(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return `${name || "Unknown"} <${user.email ?? user.id}>`;
}

function programmeLabel(programmeType) {
  switch (programmeType) {
    case "bjj":
      return "Brazilian Jiu Jitsu";
    case "muay_thai":
      return "Muay Thai";
    case "strength_conditioning":
      return "Strength & Conditioning";
    default:
      return programmeType;
  }
}

function countMembershipsByType(activeMemberships, programmesById) {
  const counts = Object.fromEntries(
    PORTAL_PROGRAMME_TYPES.map((type) => [type, 0]),
  );

  for (const membership of activeMemberships) {
    const programme = programmesById.get(membership.programme_id);
    if (programme && counts[programme.programme_type] !== undefined) {
      counts[programme.programme_type] += 1;
    }
  }

  return counts;
}

function countBookingAccessByType(bookingAccessRows, programmesById) {
  const counts = Object.fromEntries(
    PORTAL_PROGRAMME_TYPES.map((type) => [type, 0]),
  );

  for (const row of bookingAccessRows) {
    const programme = programmesById.get(row.programme_id);
    if (programme && counts[programme.programme_type] !== undefined) {
      counts[programme.programme_type] += 1;
    }
  }

  return counts;
}

function membershipTypesForUser(userId, activeMemberships, programmesById) {
  const types = new Set();

  for (const membership of activeMemberships) {
    if (membership.user_id !== userId) {
      continue;
    }

    const programme = programmesById.get(membership.programme_id);
    if (programme) {
      types.add(programme.programme_type);
    }
  }

  return types;
}

function bookingTypesForUser(userId, bookingAccessRows, programmesById) {
  const types = new Set();

  for (const row of bookingAccessRows) {
    if (row.user_id !== userId) {
      continue;
    }

    const programme = programmesById.get(row.programme_id);
    if (programme) {
      types.add(programme.programme_type);
    }
  }

  return types;
}

function formatTypeSet(types) {
  return PORTAL_PROGRAMME_TYPES.filter((type) => types.has(type))
    .map(programmeLabel)
    .join(", ") || "none";
}

async function main() {
  loadEnv();
  const { dryRun } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type, club_id, name")
    .in("programme_type", PORTAL_PROGRAMME_TYPES);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const programmesById = new Map((programmes ?? []).map((row) => [row.id, row]));
  const programmesByType = new Map(
    (programmes ?? []).map((row) => [row.programme_type, row]),
  );
  const programmeIdsByType = Object.fromEntries(
    PORTAL_PROGRAMME_TYPES.map((type) => [
      type,
      (programmes ?? [])
        .filter((row) => row.programme_type === type)
        .map((row) => row.id),
    ]),
  );

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, first_name, last_name");

  if (usersError) {
    throw new Error(usersError.message);
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

  const { data: gradeAwards, error: gradeAwardsError } = await supabase
    .from("grade_awards")
    .select("user_id");

  if (gradeAwardsError) {
    throw new Error(gradeAwardsError.message);
  }

  const usersWithGrades = new Set((gradeAwards ?? []).map((row) => row.user_id));
  const activeMemberships = memberships ?? [];

  const membershipChanges = [];
  const bookingChanges = [];

  for (const user of users ?? []) {
    const currentMembershipTypes = membershipTypesForUser(
      user.id,
      activeMemberships,
      programmesById,
    );
    const currentBookingTypes = bookingTypesForUser(
      user.id,
      bookingAccessRows,
      programmesById,
    );

    const hasBjjMembership = currentMembershipTypes.has("bjj");
    const hasMuayThaiMembership = currentMembershipTypes.has("muay_thai");
    const hasStrengthMembership = currentMembershipTypes.has("strength_conditioning");
    const hasGrades = usersWithGrades.has(user.id);
    const isImportedBjjStudent = hasBjjMembership && hasGrades;
    const isMuayThaiCreatedStudent =
      hasMuayThaiMembership && !hasGrades && hasBjjMembership;

    const targetMembershipTypes = new Set(currentMembershipTypes);
    const targetBookingTypes = new Set(currentBookingTypes);

    if (isImportedBjjStudent) {
      targetMembershipTypes.clear();
      targetMembershipTypes.add("bjj");

      for (const type of PORTAL_PROGRAMME_TYPES) {
        targetBookingTypes.add(type);
      }
    } else if (isMuayThaiCreatedStudent) {
      targetMembershipTypes.delete("bjj");
    }

    const membershipWouldChange =
      currentMembershipTypes.size !== targetMembershipTypes.size ||
      PORTAL_PROGRAMME_TYPES.some(
        (type) => currentMembershipTypes.has(type) !== targetMembershipTypes.has(type),
      );

    const bookingWouldChange =
      currentBookingTypes.size !== targetBookingTypes.size ||
      PORTAL_PROGRAMME_TYPES.some(
        (type) => currentBookingTypes.has(type) !== targetBookingTypes.has(type),
      );

    if (membershipWouldChange) {
      membershipChanges.push({
        user,
        before: new Set(currentMembershipTypes),
        after: new Set(targetMembershipTypes),
        removeProgrammeIds: activeMemberships
          .filter((membership) => membership.user_id === user.id)
          .map((membership) => membership.programme_id)
          .filter((programmeId) => {
            const programme = programmesById.get(programmeId);
            return programme && !targetMembershipTypes.has(programme.programme_type);
          }),
        addProgrammeIds: PORTAL_PROGRAMME_TYPES.flatMap((type) => {
          if (!targetMembershipTypes.has(type)) {
            return [];
          }

          if (currentMembershipTypes.has(type)) {
            return [];
          }

          return programmeIdsByType[type] ?? [];
        }),
      });
    }

    if (bookingWouldChange) {
      bookingChanges.push({
        user,
        before: new Set(currentBookingTypes),
        after: new Set(targetBookingTypes),
        removeProgrammeIds: bookingAccessRows
          .filter((row) => row.user_id === user.id)
          .map((row) => row.programme_id)
          .filter((programmeId) => {
            const programme = programmesById.get(programmeId);
            return programme && !targetBookingTypes.has(programme.programme_type);
          }),
        addProgrammeIds: PORTAL_PROGRAMME_TYPES.flatMap((type) => {
          if (!targetBookingTypes.has(type)) {
            return [];
          }

          if (currentBookingTypes.has(type)) {
            return [];
          }

          return programmeIdsByType[type] ?? [];
        }),
      });
    }
  }

  const membershipBeforeCounts = countMembershipsByType(
    activeMemberships,
    programmesById,
  );
  const bookingBeforeCounts = countBookingAccessByType(
    bookingAccessRows,
    programmesById,
  );

  const membershipAfterCounts = { ...membershipBeforeCounts };
  const bookingAfterCounts = { ...bookingBeforeCounts };

  for (const change of membershipChanges) {
    for (const type of PORTAL_PROGRAMME_TYPES) {
      if (change.before.has(type)) {
        membershipAfterCounts[type] -= 1;
      }
      if (change.after.has(type)) {
        membershipAfterCounts[type] += 1;
      }
    }
  }

  for (const change of bookingChanges) {
    for (const type of PORTAL_PROGRAMME_TYPES) {
      if (change.before.has(type)) {
        bookingAfterCounts[type] -= 1;
      }
      if (change.after.has(type)) {
        bookingAfterCounts[type] += 1;
      }
    }
  }

  console.log(dryRun ? "DRY RUN — no changes will be applied\n" : "APPLYING REPAIR\n");

  console.log("Programme student area counts");
  for (const type of PORTAL_PROGRAMME_TYPES) {
    console.log(
      `  ${programmeLabel(type)}: ${membershipBeforeCounts[type]} -> ${membershipAfterCounts[type]}`,
    );
  }

  console.log("\nBooking access counts");
  for (const type of PORTAL_PROGRAMME_TYPES) {
    console.log(
      `  ${programmeLabel(type)}: ${bookingBeforeCounts[type]} -> ${bookingAfterCounts[type]}`,
    );
  }

  console.log(`\nProgramme student area membership changes (${membershipChanges.length})`);
  for (const change of membershipChanges) {
    console.log(
      `  ${formatUser(change.user)}: ${formatTypeSet(change.before)} -> ${formatTypeSet(change.after)}`,
    );
  }

  console.log(`\nBooking access changes (${bookingChanges.length})`);
  for (const change of bookingChanges) {
    console.log(
      `  ${formatUser(change.user)}: ${formatTypeSet(change.before)} -> ${formatTypeSet(change.after)}`,
    );
  }

  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  for (const change of membershipChanges) {
    if (change.removeProgrammeIds.length > 0) {
      const { error } = await supabase
        .from("programme_memberships")
        .delete()
        .eq("user_id", change.user.id)
        .in("programme_id", change.removeProgrammeIds);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (change.addProgrammeIds.length > 0) {
      const { error } = await supabase.from("programme_memberships").upsert(
        change.addProgrammeIds.map((programmeId) => ({
          programme_id: programmeId,
          user_id: change.user.id,
          status: "active",
        })),
        { onConflict: "programme_id,user_id" },
      );

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  for (const change of bookingChanges) {
    if (change.removeProgrammeIds.length > 0) {
      const { error } = await supabase
        .from("programme_booking_access")
        .delete()
        .eq("user_id", change.user.id)
        .in("programme_id", change.removeProgrammeIds);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (change.addProgrammeIds.length > 0) {
      const { error } = await supabase.from("programme_booking_access").upsert(
        change.addProgrammeIds.map((programmeId) => ({
          programme_id: programmeId,
          user_id: change.user.id,
        })),
        { onConflict: "programme_id,user_id" },
      );

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  console.log("\nRepair complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
