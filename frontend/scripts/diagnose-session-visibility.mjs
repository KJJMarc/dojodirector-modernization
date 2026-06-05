#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LONDON = "Europe/London";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 5; i++) {
    const p = getLondonParts(new Date(guess));
    const ly = Number(p.year), lm = Number(p.month), ld = Number(p.day);
    const lh = Number(p.hour), lmin = Number(p.minute);
    if (ly === year && lm === month && ld === day && lh === hour && lmin === minute) {
      return new Date(guess).toISOString();
    }
    guess += (hour * 60 + minute - (lh * 60 + lmin)) * 60 * 1000;
  }
  return new Date(guess).toISOString();
}

function getLondonTodayDateKey(from = new Date()) {
  const p = getLondonParts(from);
  return `${p.year}-${p.month}-${p.day}`;
}

function addLondonCalendarDays(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}-${String(anchor.getUTCDate()).padStart(2, "0")}`;
}

function getLondonDateRangeIso(daysAhead) {
  const todayKey = getLondonTodayDateKey();
  const endKey = addLondonCalendarDays(todayKey, daysAhead);
  return {
    startIso: londonLocalDateTimeToUtcIso(todayKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(endKey, "00:00"),
    todayKey,
    endKey,
  };
}

const kjjSlug = process.argv[2] || "kingston-jiu-jitsu";
const { data: club } = await supabase.from("clubs").select("id, slug").eq("slug", kjjSlug).maybeSingle();
if (!club) {
  console.error("Club not found");
  process.exit(1);
}

const bookingRange = getLondonDateRangeIso(14);
const attendanceRange = getLondonDateRangeIso(56);

console.log("Club:", club.slug, club.id);
console.log("Booking range:", bookingRange);
console.log("Attendance range:", attendanceRange);

for (const [label, range] of [
  ["booking", bookingRange],
  ["attendance", attendanceRange],
]) {
  const { data, count } = await supabase
    .from("class_sessions")
    .select("id, class_id, starts_at, status, external_id, recurring_schedule_id, source", { count: "exact" })
    .eq("club_id", club.id)
    .gte("starts_at", range.startIso)
    .lt("starts_at", range.endIso)
    .order("starts_at");

  const scheduled = (data || []).filter((s) => s.status === "scheduled" || s.status === null);
  console.log(`\n=== ${label}: ${count} total, ${scheduled.length} scheduled ===`);

  const classIds = [...new Set(scheduled.map((s) => s.class_id))];
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, is_active")
    .in("id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);

  const classById = new Map((classes || []).map((c) => [c.id, c]));
  const byClass = new Map();
  for (const s of scheduled) {
    const name = classById.get(s.class_id)?.name || s.class_id;
    byClass.set(name, (byClass.get(name) || 0) + 1);
  }
  console.log("By class:", Object.fromEntries([...byClass.entries()].sort((a, b) => b[1] - a[1])));

  const sample = scheduled.slice(0, 8).map((s) => ({
    name: classById.get(s.class_id)?.name,
    starts_at: s.starts_at,
    external_id: s.external_id?.slice(0, 80),
    recurring_schedule_id: s.recurring_schedule_id,
  }));
  console.log("Sample:", JSON.stringify(sample, null, 2));
}

const { data: schedules } = await supabase
  .from("recurring_class_schedules")
  .select("id, class_id, day_of_week, start_time, location, is_active, classes(name)")
  .eq("club_id", club.id);

console.log("\n=== Recurring schedules ===");
for (const s of schedules || []) {
  console.log(s.is_active ? "ACTIVE" : "INACTIVE", s.classes?.name, s.day_of_week, s.start_time, s.location);
}
