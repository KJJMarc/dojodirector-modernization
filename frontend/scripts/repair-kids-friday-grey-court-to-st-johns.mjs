#!/usr/bin/env node
/**
 * Repair Kids Friday Grey Court School sessions → St. John's Parish Hall.
 *
 * Updates recurring_class_schedules.location and rewrites session external_id
 * venue suffixes so booking UI shows St John's.
 *
 * Usage:
 *   cd frontend && node scripts/repair-kids-friday-grey-court-to-st-johns.mjs
 *   cd frontend && node scripts/repair-kids-friday-grey-court-to-st-johns.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes("--apply");
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const OLD_LOCATION = "Grey Court School";
const NEW_LOCATION = "St. John's Parish Hall";
const FRIDAY = 5;
const TARGET_START_TIMES = new Set(["17:15:00", "17:15", "18:00:00", "18:00"]);

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

function encodeLocationForExternalId(location) {
  return location.trim().replace(/\s+/g, "_");
}

function rewriteSessionExternalIdLocation(externalId, location) {
  if (!externalId) return null;
  const match = externalId.match(
    /^((?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}(?::\d{2})?):(.+)$/,
  );
  if (!match?.[1]) return externalId;
  return `${match[1]}:${encodeLocationForExternalId(location)}`;
}

function normalizeTime(value) {
  return String(value ?? "").slice(0, 5);
}

function normalizeVenue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function isGreyCourt(value) {
  return normalizeVenue(value).includes("grey court");
}

async function main() {
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
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (clubError) throw clubError;
  if (!club) throw new Error(`Club not found: ${KIDS_SLUG}`);

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, class_id, day_of_week, start_time, location, is_active, classes(name)",
    )
    .eq("club_id", club.id)
    .eq("day_of_week", FRIDAY);

  if (schedulesError) throw schedulesError;

  const fridayTargets = (schedules ?? []).filter((row) => {
    const start = normalizeTime(row.start_time);
    return (
      TARGET_START_TIMES.has(row.start_time) ||
      TARGET_START_TIMES.has(start) ||
      start === "17:15" ||
      start === "18:00"
    );
  });

  console.log(`Club: ${club.name} (${club.id})`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Friday target schedules: ${fridayTargets.length}`);

  let schedulesUpdated = 0;
  for (const schedule of fridayTargets) {
    const className = schedule.classes?.name ?? schedule.class_id;
    const needsUpdate = isGreyCourt(schedule.location);
    console.log(
      `  schedule ${schedule.id} | ${className} ${normalizeTime(schedule.start_time)} | ${schedule.location} | ${needsUpdate ? "UPDATE→ St John's" : "ok"}`,
    );

    if (needsUpdate && apply) {
      const { error } = await supabase
        .from("recurring_class_schedules")
        .update({
          location: NEW_LOCATION,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id)
        .eq("club_id", club.id);

      if (error) throw error;
      schedulesUpdated += 1;
    } else if (needsUpdate) {
      schedulesUpdated += 1;
    }
  }

  const nowIso = new Date().toISOString();
  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id, starts_at, external_id, source, status, recurring_schedule_id, class_id",
    )
    .eq("club_id", club.id)
    .gte("starts_at", nowIso);

  if (sessionsError) throw sessionsError;

  const targetScheduleIds = new Set(fridayTargets.map((row) => row.id));
  const targetClassIds = new Set(fridayTargets.map((row) => row.class_id));

  const sessionsToFix = (sessions ?? []).filter((session) => {
    const externalId = session.external_id ?? "";
    const fromGreyCourtExternal = isGreyCourt(externalId);
    const linked =
      (session.recurring_schedule_id &&
        targetScheduleIds.has(session.recurring_schedule_id)) ||
      targetClassIds.has(session.class_id);

    if (!fromGreyCourtExternal) {
      return false;
    }

    // Prefer Friday Grey Court slots at 17:15 / 18:00 from external_id time.
    const timeMatch = externalId.match(/:(\d{4}-\d{2}-\d{2}):(\d{1,2}:\d{2})/);
    if (timeMatch?.[2]) {
      const start = normalizeTime(timeMatch[2]);
      if (start !== "17:15" && start !== "18:00") {
        return false;
      }
    }

    return linked || fromGreyCourtExternal;
  });

  console.log(`Future Grey Court Friday sessions to rewrite: ${sessionsToFix.length}`);

  let sessionsUpdated = 0;
  for (const session of sessionsToFix) {
    const nextExternalId = rewriteSessionExternalIdLocation(
      session.external_id,
      NEW_LOCATION,
    );
    console.log(
      `  session ${session.id} | ${session.starts_at} | ${session.external_id} → ${nextExternalId}`,
    );

    if (apply && nextExternalId && nextExternalId !== session.external_id) {
      const { error } = await supabase
        .from("class_sessions")
        .update({
          external_id: nextExternalId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (error) throw error;
      sessionsUpdated += 1;
    } else if (nextExternalId && nextExternalId !== session.external_id) {
      sessionsUpdated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        apply,
        schedulesUpdated,
        sessionsUpdated,
        note: apply
          ? "Applied Grey Court → St John's for Kids Friday slots."
          : "Dry run only. Re-run with --apply to write changes.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
