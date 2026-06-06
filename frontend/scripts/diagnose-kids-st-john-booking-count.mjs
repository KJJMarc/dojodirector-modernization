#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LONDON = "Europe/London";
const CLUB_SLUG = "kingston-jiu-jitsu-kids";
const CLASS_NAME = "Kids Jiu Jitsu (5-10)";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
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
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
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
  for (let attempt = 0; attempt < 5; attempt++) {
    const parts = getLondonParts(new Date(guess));
    const ly = Number(parts.year), lm = Number(parts.month), ld = Number(parts.day);
    const lh = Number(parts.hour), lmin = Number(parts.minute);
    if (ly === year && lm === month && ld === day && lh === hour && lmin === minute) {
      return new Date(guess).toISOString();
    }
    const target = hour * 60 + minute;
    const actual = lh * 60 + lmin;
    guess += (target - actual) * 60 * 1000;
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

function getAttendanceScheduleDateRange(from = new Date()) {
  const todayKey = getLondonTodayDateKey(from);
  const endKey = addLondonCalendarDays(todayKey, 56);
  return {
    startIso: londonLocalDateTimeToUtcIso(todayKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(endKey, "00:00"),
    startDateKey: todayKey,
    endDateKey: endKey,
  };
}

function resolveSessionLocationFromRow(row) {
  if (
    (row.source === "kjj_timetable_seed" ||
      row.source === "kids_timetable_seed" ||
      row.source === "admin_recurring" ||
      row.source === "admin_one_off") &&
    row.external_id
  ) {
    const match = row.external_id.match(
      /^(?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}(?::\d{2})?:(.+)$/,
    );
    if (match?.[1]) return match[1].replace(/_/g, " ");
  }
  return null;
}

function resolveSessionSlotTimeFromRow(row) {
  if (row.external_id) {
    const match = row.external_id.match(
      /^(?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:(\d{1,2}:\d{2})/,
    );
    if (match?.[1]) return match[1];
  }
  const p = getLondonParts(new Date(row.starts_at));
  return `${p.hour}:${p.minute}`;
}

function londonWeekdayFromSession(row) {
  if (row.external_id) {
    const dateKey = row.external_id.match(/:(\d{4}-\d{2}-\d{2}):/)?.[1];
    if (dateKey) {
      const [y, mo, d] = dateKey.split("-").map(Number);
      return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    }
  }
  const p = getLondonParts(new Date(row.starts_at));
  const [y, mo, d] = `${p.year}-${p.month}-${p.day}`.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function countsTowardAttendanceRegister(status) {
  return status === "booked" || status === "walk_in";
}

function cardCount(rows) {
  return rows.filter((r) => countsTowardAttendanceRegister(r.booking_status)).length;
}

function registerCount(rows) {
  return rows.filter(
    (r) => countsTowardAttendanceRegister(r.booking_status) && r.user_id != null,
  ).length;
}

function statusBreakdown(rows) {
  const buckets = { booked: 0, walk_in: 0, waitlisted: 0, cancelled: 0, other: 0, null_status: 0 };
  for (const r of rows) {
    const s = r.booking_status;
    if (s === "booked") buckets.booked++;
    else if (s === "walk_in") buckets.walk_in++;
    else if (s === "waitlisted") buckets.waitlisted++;
    else if (s === "cancelled") buckets.cancelled++;
    else if (s == null) buckets.null_status++;
    else buckets.other++;
  }
  return buckets;
}

console.log("=== Booking count mismatch diagnostic ===");
console.log(`Supabase URL: ${url}`);
console.log(`Run at: ${new Date().toISOString()}`);
console.log("");

const { data: club, error: clubErr } = await supabase
  .from("clubs")
  .select("id, name, slug")
  .eq("slug", CLUB_SLUG)
  .maybeSingle();

if (clubErr) throw new Error(clubErr.message);
if (!club) {
  console.error(`Club not found for slug: ${CLUB_SLUG}`);
  process.exit(1);
}
console.log("Club:", club);

const { data: klass, error: classErr } = await supabase
  .from("classes")
  .select("id, name, club_id, is_active")
  .eq("club_id", club.id)
  .eq("name", CLASS_NAME)
  .maybeSingle();

if (classErr) throw new Error(classErr.message);
if (!klass) {
  console.error(`Class not found: ${CLASS_NAME}`);
  process.exit(1);
}
console.log("Class:", klass);
console.log("");

const todayKey = getLondonTodayDateKey();
const startKey = addLondonCalendarDays(todayKey, -56);
const endKey = addLondonCalendarDays(todayKey, 56);
const wideStartIso = londonLocalDateTimeToUtcIso(startKey, "00:00");
const wideEndIso = londonLocalDateTimeToUtcIso(endKey, "00:00");

const { data: sessionRows, error: sessErr } = await supabase
  .from("class_sessions")
  .select(
    "id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id",
  )
  .eq("club_id", club.id)
  .eq("class_id", klass.id)
  .gte("starts_at", wideStartIso)
  .lt("starts_at", wideEndIso)
  .order("starts_at", { ascending: true });

if (sessErr) throw new Error(sessErr.message);

const enriched = (sessionRows ?? []).map((s) => ({
  ...s,
  location: resolveSessionLocationFromRow(s),
  slotTime: resolveSessionSlotTimeFromRow(s),
  weekday: londonWeekdayFromSession(s),
}));

const targetSessions = enriched.filter((s) => {
  const loc = (s.location ?? "").toLowerCase();
  const locMatch = loc.includes("st. john") || loc.includes("st john");
  const sat = s.weekday === 6;
  const timeMatch = s.slotTime === "9:00" || s.slotTime === "09:00";
  return locMatch && sat && timeMatch;
});

console.log(`Sessions in ±56d window for class: ${enriched.length}`);
console.log(`Matching St John Saturday ~09:00: ${targetSessions.length}`);
console.log("");

if (targetSessions.length === 0) {
  console.log("No exact matches. Nearby Saturday St John sessions:");
  for (const s of enriched.filter((x) => {
    const loc = (x.location ?? "").toLowerCase();
    return (loc.includes("st. john") || loc.includes("st john")) && x.weekday === 6;
  })) {
    console.log(`  id=${s.id} starts_at=${s.starts_at} slot=${s.slotTime} loc=${s.location} external_id=${s.external_id}`);
  }
}

for (const session of targetSessions) {
  console.log("--- Session ---");
  console.log({
    id: session.id,
    starts_at: session.starts_at,
    ends_at: session.ends_at,
    status: session.status,
    capacity: session.capacity,
    location: session.location,
    slotTime: session.slotTime,
    external_id: session.external_id,
  });

  const { data: attendees, error: attErr } = await supabase
    .from("session_attendees")
    .select("id, class_session_id, user_id, booking_status, attendance_status")
    .eq("class_session_id", session.id);

  if (attErr) throw new Error(attErr.message);
  const rows = attendees ?? [];

  const breakdown = statusBreakdown(rows);
  const nullUserId = rows.filter((r) => r.user_id == null).length;
  const nullUserIdBookedWalkIn = rows.filter(
    (r) => r.user_id == null && countsTowardAttendanceRegister(r.booking_status),
  ).length;

  console.log("Attendee rows:", rows.length);
  console.log("booking_status breakdown:", breakdown);
  console.log("null user_id (all statuses):", nullUserId);
  console.log("null user_id (booked/walk_in only):", nullUserIdBookedWalkIn);
  console.log("cardCount (booked+walk_in, all rows):", cardCount(rows));
  console.log("registerCount (booked+walk_in, user_id not null):", registerCount(rows));
  console.log("delta (card - register):", cardCount(rows) - registerCount(rows));

  if (nullUserIdBookedWalkIn > 0) {
    console.log("Rows with booked/walk_in but null user_id:");
    for (const r of rows.filter(
      (x) => x.user_id == null && countsTowardAttendanceRegister(x.booking_status),
    )) {
      console.log(`  attendee id=${r.id} status=${r.booking_status}`);
    }
  }
  console.log("");
}

const range = getAttendanceScheduleDateRange();
console.log("=== Bulk query (loadClassScheduleSessions pattern) ===");
console.log("Attendance date range:", range);

const { data: bulkSessions, error: bulkSessErr } = await supabase
  .from("class_sessions")
  .select("id, class_id, starts_at, status")
  .eq("club_id", club.id)
  .gte("starts_at", range.startIso)
  .lt("starts_at", range.endIso)
  .order("starts_at", { ascending: true });

if (bulkSessErr) throw new Error(bulkSessErr.message);

const bulkSessionList = bulkSessions ?? [];
const sessionIds = bulkSessionList.map((s) => s.id);
console.log(`Club sessions in attendance range: ${bulkSessionList.length}`);
console.log(`Session id count for .in(): ${sessionIds.length}`);

let bulkAttendees = [];
if (sessionIds.length > 0) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, class_session_id, booking_status")
    .in("class_session_id", sessionIds);
  if (error) throw new Error(error.message);
  bulkAttendees = data ?? [];
}

console.log(`Bulk session_attendees rows returned: ${bulkAttendees.length}`);
console.log(`Exactly 1000 rows (suspicious PostgREST cap): ${bulkAttendees.length === 1000}`);

let trueCount = 0;
let page = 0;
const pageSize = 1000;
while (true) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: false })
    .in("class_session_id", sessionIds)
    .range(from, to);
  if (error) throw new Error(error.message);
  trueCount += (data ?? []).length;
  if ((data ?? []).length < pageSize) break;
  page++;
}

console.log(`Paginated total session_attendees in range: ${trueCount}`);
console.log(`Bulk query truncated (true > bulk returned): ${trueCount > bulkAttendees.length}`);

if (targetSessions.length > 0) {
  const bulkCardBySession = new Map();
  for (const a of bulkAttendees) {
    if (!countsTowardAttendanceRegister(a.booking_status)) continue;
    bulkCardBySession.set(a.class_session_id, (bulkCardBySession.get(a.class_session_id) ?? 0) + 1);
  }
  console.log("");
  console.log("Target session booked counts from bulk query vs per-session query:");
  for (const s of targetSessions) {
    console.log(`  ${s.id}: bulk card=${bulkCardBySession.get(s.id) ?? 0}`);
  }
}

console.log("");
console.log("=== Done ===");
