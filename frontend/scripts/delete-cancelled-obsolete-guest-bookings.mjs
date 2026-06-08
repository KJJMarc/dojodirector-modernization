#!/usr/bin/env node
/**
 * Safe cleanup for obsolete cancelled guest bookings.
 *
 * Purpose:
 *   Remove legacy guest_bookings rows left over from before the member portal
 *   rollout, after those guests have become members and re-booked through the
 *   portal. Cleans the Guest Bookings admin list without touching live data.
 *
 * Safety checks:
 *   - Only guest_bookings with booking_status = 'cancelled'
 *   - Skips guests whose linked session_attendees row is present/absent
 *   - Only deletes session_attendees linked via guest_booking_id
 *   - Does not touch member bookings, attendance_records, users, memberships,
 *     leads, grading, retention, or reporting tables
 *   - Prints counts and transactional SQL before any delete runs
 *
 * Intended use after member portal migration:
 *   Run once per academy to clear cancelled guest/trial bookings that are no
 *   longer needed for operations. Use preview first, then execute when counts
 *   look correct. Optional --ids limits cleanup to specific admin rows.
 *
 * Preview (dry run — default):
 *   node frontend/scripts/delete-cancelled-obsolete-guest-bookings.mjs
 *   node frontend/scripts/delete-cancelled-obsolete-guest-bookings.mjs --club-slug=kingston-jiu-jitsu
 *
 * Execute delete:
 *   node frontend/scripts/delete-cancelled-obsolete-guest-bookings.mjs --execute
 *   node frontend/scripts/delete-cancelled-obsolete-guest-bookings.mjs --club-slug=kingston-jiu-jitsu --execute
 *   node frontend/scripts/delete-cancelled-obsolete-guest-bookings.mjs --ids=uuid1,uuid2 --execute
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLUB_SLUG = process.env.PROFILE_CLUB_SLUG ?? "kingston-jiu-jitsu";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) {
    throw new Error("Missing frontend/.env.local");
  }

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

function parseArgs(argv) {
  const execute = argv.includes("--execute");
  const clubSlugArg = argv.find((arg) => arg.startsWith("--club-slug="));
  const idsArg = argv.find((arg) => arg.startsWith("--ids="));

  return {
    execute,
    clubSlug: clubSlugArg?.split("=")[1]?.trim() || DEFAULT_CLUB_SLUG,
    explicitIds: idsArg
      ? idsArg
          .split("=")[1]
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [],
  };
}

function isAttendedRegisterStatus(status) {
  return status === "present" || status === "absent";
}

function sqlUuidList(ids) {
  return ids.map((id) => `'${id}'`).join(", ");
}

function buildTransactionalSql(clubId, guestBookingIds, sessionAttendeeIds) {
  const guestIdSql = sqlUuidList(guestBookingIds);
  const attendeeIdSql =
    sessionAttendeeIds.length > 0 ? sqlUuidList(sessionAttendeeIds) : null;

  const attendeeDelete = attendeeIdSql
    ? `DELETE FROM public.session_attendees
WHERE id IN (${attendeeIdSql})
  AND guest_booking_id IS NOT NULL
  AND guest_booking_id IN (${guestIdSql});`
    : `-- No linked session_attendees rows to delete.`;

  return `BEGIN;

${attendeeDelete}

DELETE FROM public.guest_bookings
WHERE id IN (${guestIdSql})
  AND club_id = '${clubId}'
  AND booking_status = 'cancelled';

COMMIT;`;
}

async function loadEligibleCancelledGuestBookings(supabase, clubId, explicitIds) {
  let query = supabase
    .from("guest_bookings")
    .select("id, first_name, last_name, email, booking_status, session_id, created_at")
    .eq("club_id", clubId)
    .eq("booking_status", "cancelled")
    .order("created_at", { ascending: false });

  if (explicitIds.length > 0) {
    query = query.in("id", explicitIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load cancelled guest bookings: ${error.message}`);
  }

  return data ?? [];
}

async function loadLinkedRegisterRows(supabase, guestBookingIds) {
  if (guestBookingIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, guest_booking_id, booking_status, attendance_status, class_session_id")
    .in("guest_booking_id", guestBookingIds);

  if (error) {
    if (error.message.includes("guest_booking_id")) {
      throw new Error(
        "session_attendees.guest_booking_id is missing. Apply the guest booking register migration first.",
      );
    }

    throw new Error(`Unable to load linked register rows: ${error.message}`);
  }

  return data ?? [];
}

async function countBookedAttendeesForSessions(supabase, sessionIds) {
  const counts = new Map();

  if (sessionIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("session_attendees")
    .select("class_session_id, booking_status")
    .in("class_session_id", sessionIds)
    .in("booking_status", ["booked", "walk_in"]);

  if (error) {
    throw new Error(`Unable to refresh booking counts: ${error.message}`);
  }

  for (const row of data ?? []) {
    counts.set(row.class_session_id, (counts.get(row.class_session_id) ?? 0) + 1);
  }

  return counts;
}

async function executeDeletes(supabase, guestBookingIds, sessionAttendeeIds) {
  if (sessionAttendeeIds.length > 0) {
    const { error: attendeeDeleteError } = await supabase
      .from("session_attendees")
      .delete()
      .in("id", sessionAttendeeIds)
      .not("guest_booking_id", "is", null);

    if (attendeeDeleteError) {
      throw new Error(
        `Failed to delete linked register rows: ${attendeeDeleteError.message}`,
      );
    }
  }

  const { error: guestDeleteError } = await supabase
    .from("guest_bookings")
    .delete()
    .in("id", guestBookingIds)
    .eq("booking_status", "cancelled");

  if (guestDeleteError) {
    throw new Error(`Failed to delete guest bookings: ${guestDeleteError.message}`);
  }
}

function printPreview({
  club,
  eligibleGuests,
  linkedRegisterRows,
  skippedGuests,
  sessionIds,
  bookingCountsAfter,
}) {
  console.log(`Club: ${club.name} (${club.slug})`);
  console.log(`guest_bookings to delete: ${eligibleGuests.length}`);
  console.log(`linked session_attendees rows to delete: ${linkedRegisterRows.length}`);

  if (eligibleGuests.length > 0) {
    console.log("\nEligible cancelled guest bookings:");
    for (const guest of eligibleGuests) {
      console.log(
        `  - ${guest.id} | ${guest.first_name} ${guest.last_name} | ${guest.email} | session ${guest.session_id}`,
      );
    }
  }

  if (linkedRegisterRows.length > 0) {
    console.log("\nLinked register rows:");
    for (const row of linkedRegisterRows) {
      console.log(
        `  - ${row.id} | guest_booking_id=${row.guest_booking_id} | booking_status=${row.booking_status} | attendance_status=${row.attendance_status ?? "null"}`,
      );
    }
  }

  if (skippedGuests.length > 0) {
    console.log("\nSkipped (not cancelled or attended on register):");
    for (const guest of skippedGuests) {
      console.log(
        `  - ${guest.id} | status=${guest.booking_status} | reason=${guest.reason}`,
      );
    }
  }

  if (sessionIds.length > 0) {
    console.log("\nBooking counts after deletion (booked + walk_in per session):");
    for (const sessionId of sessionIds) {
      console.log(`  - ${sessionId}: ${bookingCountsAfter.get(sessionId) ?? 0}`);
    }
  }
}

async function main() {
  const { execute, clubSlug, explicitIds } = parseArgs(process.argv.slice(2));
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", clubSlug)
    .maybeSingle();

  if (clubError || !club) {
    throw new Error(`Club not found: ${clubSlug}`);
  }

  const cancelledGuests = await loadEligibleCancelledGuestBookings(
    supabase,
    club.id,
    explicitIds,
  );

  if (explicitIds.length > 0) {
    const foundIds = new Set(cancelledGuests.map((row) => row.id));
    const missing = explicitIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new Error(
        `These guest booking ids were not found as cancelled bookings for ${clubSlug}: ${missing.join(", ")}`,
      );
    }
  }

  const guestBookingIds = cancelledGuests.map((row) => row.id);
  const linkedRegisterRows = await loadLinkedRegisterRows(supabase, guestBookingIds);
  const registerByGuestId = new Map(
    linkedRegisterRows.map((row) => [row.guest_booking_id, row]),
  );

  const eligibleGuests = [];
  const skippedGuests = [];

  for (const guest of cancelledGuests) {
    const registerRow = registerByGuestId.get(guest.id);

    if (registerRow && isAttendedRegisterStatus(registerRow.attendance_status)) {
      skippedGuests.push({
        ...guest,
        reason: `register attendance_status=${registerRow.attendance_status}`,
      });
      continue;
    }

    eligibleGuests.push(guest);
  }

  const eligibleGuestIds = eligibleGuests.map((row) => row.id);
  const eligibleRegisterRows = linkedRegisterRows.filter((row) =>
    eligibleGuestIds.includes(row.guest_booking_id),
  );
  const eligibleRegisterIds = eligibleRegisterRows.map((row) => row.id);
  const affectedSessionIds = Array.from(
    new Set([
      ...eligibleGuests.map((row) => row.session_id),
      ...eligibleRegisterRows.map((row) => row.class_session_id),
    ]),
  );

  const bookingCountsAfter = await countBookedAttendeesForSessions(
    supabase,
    affectedSessionIds,
  );

  for (const registerRow of eligibleRegisterRows) {
    if (
      registerRow.booking_status === "booked" ||
      registerRow.booking_status === "walk_in"
    ) {
      bookingCountsAfter.set(
        registerRow.class_session_id,
        Math.max((bookingCountsAfter.get(registerRow.class_session_id) ?? 0) - 1, 0),
      );
    }
  }

  printPreview({
    club,
    eligibleGuests,
    linkedRegisterRows: eligibleRegisterRows,
    skippedGuests,
    sessionIds: affectedSessionIds,
    bookingCountsAfter,
  });

  const sql = buildTransactionalSql(club.id, eligibleGuestIds, eligibleRegisterIds);

  console.log("\nSQL to execute:\n");
  console.log(sql);

  if (eligibleGuestIds.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  if (!execute) {
    console.log("\nDry run only. Re-run with --execute to perform the delete.");
    return;
  }

  console.log("\nExecuting delete...");
  await executeDeletes(supabase, eligibleGuestIds, eligibleRegisterIds);

  const refreshedCounts = await countBookedAttendeesForSessions(
    supabase,
    affectedSessionIds,
  );

  console.log("\nDelete complete.");
  console.log(`Deleted guest_bookings: ${eligibleGuestIds.length}`);
  console.log(`Deleted session_attendees: ${eligibleRegisterIds.length}`);
  console.log("\nRefreshed booking counts (booked + walk_in per session):");
  for (const sessionId of affectedSessionIds) {
    console.log(`  - ${sessionId}: ${refreshedCounts.get(sessionId) ?? 0}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
