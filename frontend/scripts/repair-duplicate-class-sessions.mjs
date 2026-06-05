#!/usr/bin/env node
/**
 * Merge duplicate class_sessions that share club_id + class_id + starts_at.
 * Prefers the session with attendance marked, then kids_timetable_seed, then oldest.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/repair-duplicate-class-sessions.mjs --dry-run
 *   node frontend/scripts/repair-duplicate-class-sessions.mjs --club-slug=kingston-jiu-jitsu-kids
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const dryRun = process.argv.includes("--dry-run");
const clubSlugArg = process.argv.find((arg) => arg.startsWith("--club-slug="));
const clubSlugFilter = clubSlugArg?.split("=")[1]?.trim() || null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadClubs() {
  let query = supabase.from("clubs").select("id, slug, name");
  if (clubSlugFilter) {
    query = query.eq("slug", clubSlugFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadSessionsForClub(clubId) {
  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, club_id, class_id, starts_at, ends_at, source, external_id, recurring_schedule_id, status, created_at, classes(name)",
    )
    .eq("club_id", clubId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function scoreSession(sessionId) {
  const [{ count: attendeeCount }, { count: presentCount }, { count: recordCount }] =
    await Promise.all([
      supabase
        .from("session_attendees")
        .select("id", { count: "exact", head: true })
        .eq("class_session_id", sessionId)
        .in("booking_status", ["booked", "walk_in"]),
      supabase
        .from("session_attendees")
        .select("id", { count: "exact", head: true })
        .eq("class_session_id", sessionId)
        .eq("attendance_status", "present"),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("class_session_id", sessionId),
    ]);

  return {
    attendeeCount: attendeeCount ?? 0,
    presentCount: presentCount ?? 0,
    recordCount: recordCount ?? 0,
  };
}

function sourceBonus(source) {
  if (source === "kids_timetable_seed") return 50;
  if (source === "admin_recurring") return 0;
  return 10;
}

async function pickCanonicalSession(sessions) {
  const scored = [];

  for (const session of sessions) {
    const metrics = await scoreSession(session.id);
    const className = Array.isArray(session.classes)
      ? session.classes[0]?.name
      : session.classes?.name;

    scored.push({
      session,
      className,
      metrics,
      score:
        metrics.recordCount * 1000 +
        metrics.presentCount * 100 +
        metrics.attendeeCount +
        sourceBonus(session.source) -
        new Date(session.created_at).getTime() / 1_000_000_000,
    });
  }

  scored.sort((left, right) => right.score - left.score);
  return scored;
}

async function loadCanonicalAttendeeKeys(canonicalId) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, booking_status")
    .eq("class_session_id", canonicalId);

  if (error) throw new Error(error.message);

  const byUserId = new Map();
  for (const row of data ?? []) {
    byUserId.set(row.user_id, row);
  }

  return byUserId;
}

async function mergeDuplicateIntoCanonical(canonical, duplicate, className) {
  const canonicalAttendees = await loadCanonicalAttendeeKeys(canonical.id);
  const { data: duplicateAttendees, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, booking_status, attendance_status")
    .eq("class_session_id", duplicate.id);

  if (error) throw new Error(error.message);

  let moved = 0;
  let deleted = 0;

  for (const attendee of duplicateAttendees ?? []) {
    if (canonicalAttendees.has(attendee.user_id)) {
      if (!dryRun) {
        const { error: deleteError } = await supabase
          .from("session_attendees")
          .delete()
          .eq("id", attendee.id);
        if (deleteError) throw new Error(deleteError.message);
      }
      deleted += 1;
      continue;
    }

    if (!dryRun) {
      const { error: moveError } = await supabase
        .from("session_attendees")
        .update({ class_session_id: canonical.id })
        .eq("id", attendee.id);
      if (moveError) throw new Error(moveError.message);
    }
    moved += 1;
    canonicalAttendees.set(attendee.user_id, attendee);
  }

  const tablesToRepoint = [
    { table: "guest_bookings", column: "session_id" },
    { table: "session_waitlist", column: "session_id" },
    { table: "instructor_assignments", column: "class_session_id" },
  ];

  for (const { table, column } of tablesToRepoint) {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, duplicate.id);

    if ((count ?? 0) > 0) {
      if (!dryRun) {
        const { error: repointError } = await supabase
          .from(table)
          .update({ [column]: canonical.id })
          .eq(column, duplicate.id);
        if (repointError) throw new Error(`${table}: ${repointError.message}`);
      }
      console.log(`  repoint ${table}: ${count}`);
    }
  }

  if (!dryRun) {
    const { error: deleteSessionError } = await supabase
      .from("class_sessions")
      .delete()
      .eq("id", duplicate.id);
    if (deleteSessionError) throw new Error(deleteSessionError.message);
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${className} ${canonical.starts_at}`,
  );
  console.log(`  keep ${canonical.id} (${canonical.source})`);
  console.log(`  remove ${duplicate.id} (${duplicate.source})`);
  console.log(`  attendees moved=${moved} deleted=${deleted}`);
}

async function main() {
  const clubs = await loadClubs();
  let duplicateGroups = 0;
  let removedSessions = 0;

  for (const club of clubs) {
    const sessions = await loadSessionsForClub(club.id);
    const groups = new Map();

    for (const session of sessions) {
      const key = `${session.class_id}|${session.starts_at}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(session);
    }

    for (const group of groups.values()) {
      if (group.length < 2) continue;
      duplicateGroups += 1;

      const scored = await pickCanonicalSession(group);
      const canonical = scored[0].session;
      const className = scored[0].className ?? "Class";

      console.log(`\n${club.slug}: duplicate group (${group.length})`);
      for (const entry of scored) {
        console.log(
          `  candidate ${entry.session.id} source=${entry.session.source} booked=${entry.metrics.attendeeCount} present=${entry.metrics.presentCount} records=${entry.metrics.recordCount}`,
        );
      }

      for (const duplicate of group) {
        if (duplicate.id === canonical.id) continue;
        await mergeDuplicateIntoCanonical(canonical, duplicate, className);
        removedSessions += 1;
      }
    }
  }

  console.log(
    `\n${dryRun ? "Dry run" : "Repair"} complete: ${duplicateGroups} duplicate groups, ${removedSessions} sessions ${dryRun ? "would be " : ""}removed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
