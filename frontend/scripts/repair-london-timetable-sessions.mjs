#!/usr/bin/env node
/**
 * Repair class_sessions with incorrect starts_at/ends_at for all academies.
 * Uses slot date/time from external_id and end_time from recurring_class_schedules.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/repair-london-timetable-sessions.mjs --dry-run
 *   node frontend/scripts/repair-london-timetable-sessions.mjs
 *   node frontend/scripts/repair-london-timetable-sessions.mjs --club-slug kingston-jiu-jitsu
 *   node frontend/scripts/repair-london-timetable-sessions.mjs --regenerate
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LONDON_TIMEZONE = "Europe/London";

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
const regenerate = process.argv.includes("--regenerate");
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
    if (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    guess += (targetMinutes - actualMinutes) * 60 * 1000;
  }

  return new Date(guess).toISOString();
}

function normalizeTime(value) {
  if (!value) return "";
  const [hours, minutes] = String(value).split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function parseTimetableExternalId(externalId) {
  if (!externalId) return null;

  const dateMatch = externalId.match(/:(\d{4}-\d{2}-\d{2}):(\d{1,2}:\d{2}):/);
  if (!dateMatch) return null;

  const locationMatch = externalId.match(
    /^(?:kids_timetable|admin_recurring|admin_one_off|kjj_timetable):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}:(.+)$/,
  );

  return {
    date: dateMatch[1],
    startTime: normalizeTime(dateMatch[2]),
    location: locationMatch?.[1]?.replace(/_/g, " ") ?? "",
  };
}

function londonTimeLabel(iso) {
  const parts = getLondonParts(new Date(iso));
  return `${parts.hour}:${parts.minute}`;
}

function scheduleSlotKey(schedule, className) {
  return `${className}|${schedule.day_of_week}|${normalizeTime(schedule.start_time)}|${schedule.location ?? ""}`;
}

async function repairClub(club) {
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("club_id", club.id);

  if (classesError) {
    throw new Error(`[${club.slug}] Failed to load classes: ${classesError.message}`);
  }

  const classNameById = new Map((classes ?? []).map((row) => [row.id, row.name]));

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id, class_id, day_of_week, start_time, end_time, location, is_active")
    .eq("club_id", club.id)
    .eq("is_active", true);

  if (schedulesError) {
    throw new Error(`[${club.slug}] Failed to load schedules: ${schedulesError.message}`);
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
    throw new Error(`[${club.slug}] Failed to load sessions: ${sessionsError.message}`);
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
      continue;
    }

    const expectedKey = scheduleSlotKey(schedule, className);
    const actualKey = `${className}|${schedule.day_of_week}|${parsed.startTime}|${parsed.location}`;

    if (!scheduleKeys.has(expectedKey) || expectedKey !== actualKey) {
      orphans += 1;
      orphanIds.push(session.id);
      continue;
    }

    const correctStartsAt = londonLocalDateTimeToUtcIso(parsed.date, parsed.startTime);
    const correctEndsAt = londonLocalDateTimeToUtcIso(
      parsed.date,
      normalizeTime(schedule.end_time),
    );

    if (session.starts_at === correctStartsAt && session.ends_at === correctEndsAt) {
      skipped += 1;
      continue;
    }

    console.log(
      `[${club.slug}] Fix ${className} ${parsed.date} ${parsed.startTime}: ${londonTimeLabel(session.starts_at)} → ${parsed.startTime}`,
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

  if (orphanIds.length > 0 && !dryRun) {
    await supabase.from("session_attendees").delete().in("class_session_id", orphanIds);
    await supabase.from("class_sessions").delete().in("id", orphanIds);
  }

  let regenerated = 0;

  if (!dryRun && regenerate) {
    for (const schedule of schedules ?? []) {
      const { data: inserted, error: rpcError } = await supabase.rpc(
        "generate_recurring_class_sessions",
        { p_schedule_id: schedule.id, p_days_ahead: 364 },
      );

      if (rpcError) {
        throw new Error(
          `[${club.slug}] generate_recurring_class_sessions failed: ${rpcError.message}`,
        );
      }

      regenerated += inserted ?? 0;
    }
  }

  let mismatches = 0;

  const { data: verifySessions } = await supabase
    .from("class_sessions")
    .select("id, starts_at, external_id, class_id")
    .eq("club_id", club.id)
    .gte("starts_at", nowIso)
    .eq("status", "scheduled");

  for (const session of verifySessions ?? []) {
    const parsed = parseTimetableExternalId(session.external_id);
    if (!parsed) continue;
    if (parsed.startTime !== londonTimeLabel(session.starts_at)) {
      mismatches += 1;
    }
  }

  return {
    clubSlug: club.slug,
    updated,
    skipped,
    orphans: orphanIds.length,
    regenerated,
    mismatches,
    sessionCount: (verifySessions ?? []).length,
  };
}

async function main() {
  let clubsQuery = supabase.from("clubs").select("id, slug").order("slug");

  if (clubSlugFilter) {
    clubsQuery = clubsQuery.eq("slug", clubSlugFilter);
  }

  const { data: clubs, error: clubsError } = await clubsQuery;

  if (clubsError || !clubs?.length) {
    throw new Error(clubsError?.message ?? "No clubs found.");
  }

  const summaries = [];

  for (const club of clubs) {
    summaries.push(await repairClub(club));
  }

  console.log("\n--- Summary ---");
  console.log(`Dry run: ${dryRun}`);
  console.log(`Regenerate: ${regenerate && !dryRun}`);

  let totalUpdated = 0;
  let totalMismatches = 0;

  for (const row of summaries) {
    console.log(
      `${row.clubSlug}: updated=${row.updated} skipped=${row.skipped} orphans=${row.orphans} regenerated=${row.regenerated} mismatches=${row.mismatches} sessions=${row.sessionCount}`,
    );
    totalUpdated += row.updated;
    totalMismatches += row.mismatches;
  }

  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total mismatches remaining: ${totalMismatches}`);

  if (totalMismatches > 0 && !dryRun) {
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to apply fixes.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
