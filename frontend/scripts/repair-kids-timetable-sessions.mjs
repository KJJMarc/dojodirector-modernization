#!/usr/bin/env node
/**
 * Repair Kingston Jiu Jitsu Kids class_sessions that were stored +2h ahead of the
 * recurring timetable. Uses slot date/time from external_id (source of truth) and
 * end_time from recurring_class_schedules.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/repair-kids-timetable-sessions.mjs
 *
 * Options:
 *   --dry-run   Report changes without writing
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const EXPECTED_RECURRING_SCHEDULE_COUNT = 16;

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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LONDON_TIMEZONE = "Europe/London";

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    const londonYear = Number(parts.year);
    const londonMonth = Number(parts.month);
    const londonDay = Number(parts.day);
    const londonHour = Number(parts.hour);
    const londonMinute = Number(parts.minute);

    if (
      londonYear === year &&
      londonMonth === month &&
      londonDay === day &&
      londonHour === hour &&
      londonMinute === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = londonHour * 60 + londonMinute;
    guess += (targetMinutes - actualMinutes) * 60 * 1000;
  }

  return new Date(guess).toISOString();
}

function normalizeTime(value) {
  if (!value) return "";
  const text = String(value);
  const [hours, minutes] = text.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function parseTimetableExternalId(externalId) {
  if (!externalId) return null;

  const match = externalId.match(
    /^(?:kids_timetable|admin_recurring|kjj_timetable):[^:]+:\d{4}-\d{2}-\d{2}:(\d{1,2}:\d{2}):(.+)$/,
  );

  if (!match) return null;

  const dateMatch = externalId.match(/:(\d{4}-\d{2}-\d{2}):(\d{1,2}:\d{2}):/);
  if (!dateMatch) return null;

  return {
    date: dateMatch[1],
    startTime: normalizeTime(dateMatch[2]),
    location: match[2].replace(/_/g, " "),
  };
}

function londonTimeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: LONDON_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function londonDayOfWeek(iso) {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    weekday: "short",
  }).format(new Date(iso));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? null;
}

function scheduleSlotKey(schedule, className) {
  return `${className}|${schedule.day_of_week}|${normalizeTime(schedule.start_time)}|${schedule.location ?? ""}`;
}

async function main() {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (clubError || !club) {
    throw new Error(`Kids club not found: ${clubError?.message ?? KIDS_SLUG}`);
  }

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("club_id", club.id);

  if (classesError) {
    throw new Error(`Failed to load classes: ${classesError.message}`);
  }

  const classNameById = new Map((classes ?? []).map((row) => [row.id, row.name]));

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id, class_id, day_of_week, start_time, end_time, location, is_active")
    .eq("club_id", club.id)
    .eq("is_active", true);

  if (schedulesError) {
    throw new Error(`Failed to load recurring schedules: ${schedulesError.message}`);
  }

  if ((schedules ?? []).length !== EXPECTED_RECURRING_SCHEDULE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_RECURRING_SCHEDULE_COUNT} active recurring schedules, found ${(schedules ?? []).length}`,
    );
  }

  const scheduleById = new Map((schedules ?? []).map((row) => [row.id, row]));
  const scheduleKeys = new Set(
    (schedules ?? []).map((row) =>
      scheduleSlotKey(row, classNameById.get(row.class_id) ?? ""),
    ),
  );

  const nowIso = new Date().toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, status, source, external_id, recurring_schedule_id",
    )
    .eq("club_id", club.id)
    .gte("starts_at", nowIso)
    .eq("status", "scheduled");

  if (sessionsError) {
    throw new Error(`Failed to load sessions: ${sessionsError.message}`);
  }

  let updated = 0;
  let skipped = 0;
  let orphans = 0;
  const orphanIds = [];

  for (const session of sessions ?? []) {
    const schedule = session.recurring_schedule_id
      ? scheduleById.get(session.recurring_schedule_id)
      : null;
    const parsed = parseTimetableExternalId(session.external_id);
    const className = classNameById.get(session.class_id) ?? "";

    if (!schedule || !parsed) {
      orphans += 1;
      orphanIds.push(session.id);
      console.warn(
        `Orphan session ${session.id} (${className}) — missing schedule link or external_id`,
      );
      continue;
    }

    const expectedKey = scheduleSlotKey(schedule, className);
    const actualKey = `${className}|${schedule.day_of_week}|${parsed.startTime}|${parsed.location}`;

    if (!scheduleKeys.has(expectedKey) || expectedKey !== actualKey) {
      orphans += 1;
      orphanIds.push(session.id);
      console.warn(
        `Orphan session ${session.id} (${className}) — slot ${actualKey} != ${expectedKey}`,
      );
      continue;
    }

    const correctStartsAt = londonLocalDateTimeToUtcIso(parsed.date, parsed.startTime);
    const correctEndsAt = londonLocalDateTimeToUtcIso(
      parsed.date,
      normalizeTime(schedule.end_time),
    );

    if (
      session.starts_at === correctStartsAt &&
      session.ends_at === correctEndsAt
    ) {
      skipped += 1;
      continue;
    }

    console.log(
      `Fix ${className} ${parsed.date} ${parsed.startTime}–${normalizeTime(schedule.end_time)} @ ${parsed.location}: ${londonTimeLabel(session.starts_at)} → ${parsed.startTime}`,
    );

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("class_sessions")
        .update({
          starts_at: correctStartsAt,
          ends_at: correctEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (updateError) {
        throw new Error(`Failed to update session ${session.id}: ${updateError.message}`);
      }
    }

    updated += 1;
  }

  if (orphanIds.length > 0) {
    console.log(`\nRemoving ${orphanIds.length} orphan future session(s)...`);

    if (!dryRun) {
      const { error: attendeeDeleteError } = await supabase
        .from("session_attendees")
        .delete()
        .in("class_session_id", orphanIds);

      if (attendeeDeleteError) {
        throw new Error(`Failed to clear orphan bookings: ${attendeeDeleteError.message}`);
      }

      const { error: deleteError } = await supabase
        .from("class_sessions")
        .delete()
        .in("id", orphanIds);

      if (deleteError) {
        throw new Error(`Failed to delete orphan sessions: ${deleteError.message}`);
      }
    }
  }

  let regenerated = 0;

  // Optional: fill missing horizon after SQL migration deploys make_timestamptz generator.
  if (!dryRun && process.argv.includes("--regenerate")) {
    for (const schedule of schedules ?? []) {
      const { data: inserted, error: rpcError } = await supabase.rpc(
        "generate_recurring_class_sessions",
        {
          p_schedule_id: schedule.id,
          p_days_ahead: 364,
        },
      );

      if (rpcError) {
        throw new Error(
          `generate_recurring_class_sessions failed for ${schedule.id}: ${rpcError.message}`,
        );
      }

      regenerated += inserted ?? 0;
    }
  }

  const { data: verifySessions, error: verifyError } = await supabase
    .from("class_sessions")
    .select("id, starts_at, external_id, recurring_schedule_id, class_id")
    .eq("club_id", club.id)
    .gte("starts_at", nowIso)
    .eq("status", "scheduled");

  if (verifyError) {
    throw new Error(`Verification load failed: ${verifyError.message}`);
  }

  let mismatches = 0;

  for (const session of verifySessions ?? []) {
    const parsed = parseTimetableExternalId(session.external_id);
    if (!parsed) continue;
    const london = londonTimeLabel(session.starts_at);
    if (parsed.startTime !== london) {
      mismatches += 1;
      console.error(
        `Still mismatched: ${classNameById.get(session.class_id)} ${parsed.date} ext ${parsed.startTime} vs ${london}`,
      );
    }
  }

  const sessionsBySchedule = new Map();

  for (const session of verifySessions ?? []) {
    if (!session.recurring_schedule_id) continue;
    const list = sessionsBySchedule.get(session.recurring_schedule_id) ?? [];
    list.push(session);
    sessionsBySchedule.set(session.recurring_schedule_id, list);
  }

  console.log("\n--- Summary ---");
  console.log(`Dry run: ${dryRun}`);
  console.log(`Sessions updated: ${updated}`);
  console.log(`Sessions already correct: ${skipped}`);
  console.log(`Orphan sessions removed: ${orphanIds.length}`);
  console.log(`New sessions generated (RPC): ${regenerated}`);
  console.log(`Upcoming scheduled sessions: ${(verifySessions ?? []).length}`);
  console.log(`Time mismatches remaining: ${mismatches}`);
  console.log(`Recurring schedules: ${(schedules ?? []).length}`);

  if (mismatches > 0 && !dryRun) {
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to apply fixes.");
    return;
  }
  console.log("\nKids timetable session repair completed successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
