#!/usr/bin/env node
/**
 * One-off profiler for student portal Book a Class data loading.
 * Does not modify app code — mirrors production query paths with timings.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LONDON = "Europe/London";
const CLUB_SLUG = process.env.PROFILE_CLUB_SLUG ?? "kingston-jiu-jitsu";
const SUPABASE_PAGE_SIZE = 1000;
const RECURRING_CLASS_SESSION_DAYS_AHEAD = 364;

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing frontend/.env.local");
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

let queryCount = 0;
const queryLog = [];

function trackQuery(label) {
  queryCount += 1;
  queryLog.push(label);
}

async function timedQuery(label, fn) {
  trackQuery(label);
  return fn();
}

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

function getLondonDateRangeIso({ daysAhead, from = new Date() }) {
  const p = getLondonParts(from);
  const startKey = `${p.year}-${p.month}-${p.day}`;
  const [y, m, d] = startKey.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + daysAhead));
  const ep = getLondonParts(end);
  const endKey = `${ep.year}-${ep.month}-${ep.day}`;
  const startIso = londonLocalMidnightToUtcIso(startKey);
  const endIso = londonLocalMidnightToUtcIso(endKey);
  return { startIso, endIso };
}

function londonLocalMidnightToUtcIso(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  let guess = Date.UTC(year, month - 1, day, 0, 0);
  for (let attempt = 0; attempt < 5; attempt++) {
    const parts = getLondonParts(new Date(guess));
    const ly = Number(parts.year);
    const lm = Number(parts.month);
    const ld = Number(parts.day);
    const lh = Number(parts.hour);
    const lmin = Number(parts.minute);
    if (ly === year && lm === month && ld === day && lh === 0 && lmin === 0) {
      return new Date(guess).toISOString();
    }
    guess -= lh * 60 * 60 * 1000 + lmin * 60 * 1000;
  }
  return new Date(guess).toISOString();
}

async function time(label, fn) {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  return { label, ms, result };
}

async function ensureClubRecurringFutureSessions(clubId) {
  const nowIso = new Date().toISOString();
  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id")
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (schedulesError || !schedules?.length) {
    return { scheduleCount: 0, rpcCalls: 0 };
  }

  let rpcCalls = 0;
  for (const schedule of schedules) {
    const { count, error: countError } = await supabase
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("recurring_schedule_id", schedule.id)
      .gte("starts_at", nowIso)
      .neq("status", "cancelled");

    if (countError || (count ?? 0) >= 1) {
      continue;
    }

    await supabase.rpc("generate_recurring_class_sessions", {
      p_schedule_id: schedule.id,
      p_days_ahead: RECURRING_CLASS_SESSION_DAYS_AHEAD,
    });
    rpcCalls += 1;
  }

  return { scheduleCount: schedules.length, rpcCalls };
}

async function fetchSessionAttendeesForScheduleCounts(sessionIds) {
  if (sessionIds.length === 0) return [];
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("session_attendees")
      .select("id, class_session_id, booking_status, user_id")
      .in("class_session_id", sessionIds)
      .range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return rows;
}

async function loadClassScheduleSessions({ startIso, endIso, clubId }, timings) {
  const ensureTimed = await time("ensureClubRecurringFutureSessions", () =>
    ensureClubRecurringFutureSessions(clubId),
  );
  if (timings) {
    timings.ensureClubRecurringFutureSessions = ensureTimed.ms;
    timings.ensureDetail = ensureTimed.result;
  }
  const ensure = ensureTimed.result;

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id",
    )
    .eq("club_id", clubId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (sessionsError) throw new Error(sessionsError.message);

  const sessions = (sessionRows ?? []).filter(
    (s) => s.status === "scheduled" || s.status === null,
  );

  if (sessions.length === 0) {
    return { sessions: [], ensure, attendeeRows: 0 };
  }

  const sessionIds = sessions.map((s) => s.id);
  const classIds = [...new Set(sessions.map((s) => s.class_id))];

  const [classesResult, attendeeRows, recurringSchedulesResult] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, name, is_active, club_id, programme_id")
        .in("id", classIds),
      fetchSessionAttendeesForScheduleCounts(sessionIds),
      supabase
        .from("recurring_class_schedules")
        .select("id, class_id, day_of_week, start_time, location, is_active")
        .eq("club_id", clubId),
    ]);

  if (classesResult.error) throw new Error(classesResult.error.message);
  if (recurringSchedulesResult.error) {
    throw new Error(recurringSchedulesResult.error.message);
  }

  const activeClassIds = new Set(
    (classesResult.data ?? [])
      .filter((row) => row.is_active !== false)
      .map((row) => row.id),
  );

  const visibleSessions = sessions.filter((session) =>
    activeClassIds.has(session.class_id),
  );

  return {
    sessions: visibleSessions,
    ensure,
    attendeeRows: attendeeRows.length,
    classCount: classIds.length,
    programmeIdByClassId: new Map(
      (classesResult.data ?? []).map((row) => [row.id, row.programme_id]),
    ),
  };
}

async function loadStudentActiveProgrammeIdsForBooking(userId, clubId) {
  const { error: schemaError } = await supabase.from("programmes").select("id").limit(1);
  if (schemaError) return null;

  const { data: accessProgrammes, error: programmesError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId)
    .in("programme_type", ["bjj", "muay_thai", "kids_bjj"]);

  if (programmesError) throw new Error(programmesError.message);

  const clubProgrammeIds = (accessProgrammes ?? []).map((row) => row.id);
  if (clubProgrammeIds.length === 0) return new Set();

  const { error: pbaProbe } = await supabase
    .from("programme_booking_access")
    .select("id")
    .limit(1);

  if (!pbaProbe) {
    const { data, error } = await supabase
      .from("programme_booking_access")
      .select("programme_id")
      .eq("user_id", userId)
      .in("programme_id", clubProgrammeIds);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((row) => row.programme_id));
  }

  const { data, error } = await supabase
    .from("programme_memberships")
    .select("programme_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("programme_id", clubProgrammeIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.programme_id));
}

async function loadExpiredOffersForSession(sessionId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "offered")
    .lt("expires_at", now);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getClassSession(sessionId) {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, club_id, starts_at, ends_at, external_id, capacity")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) throw new Error("session not found");
  return data;
}

async function getBookedCount(sessionId) {
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", sessionId)
    .eq("booking_status", "booked");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getActiveOfferForSession(sessionId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, expires_at")
    .eq("session_id", sessionId)
    .eq("status", "offered")
    .gt("expires_at", now)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function loadWaitingQueue(sessionId) {
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, user_id, status")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function tryCreateNextWaitlistOfferForSession(sessionId) {
  const classSession = await getClassSession(sessionId);
  const bookedCount = await getBookedCount(sessionId);
  const capacity = classSession.capacity;
  if (capacity !== null && bookedCount >= capacity) {
    return null;
  }
  const activeOffer = await getActiveOfferForSession(sessionId);
  if (activeOffer) return null;
  const queue = await loadWaitingQueue(sessionId);
  return queue.length > 0 ? "would-offer" : null;
}

async function processExpiredWaitlistOffersForSession(sessionId) {
  const expiredOffers = await loadExpiredOffersForSession(sessionId);
  for (const offer of expiredOffers) {
    await supabase
      .from("session_waitlist")
      .update({ status: "expired" })
      .eq("id", offer.id)
      .eq("status", "offered");
  }
  await tryCreateNextWaitlistOfferForSession(sessionId);
  return expiredOffers.length;
}

async function processExpiredWaitlistOffersForSessions(sessionIds) {
  let expiredTotal = 0;
  for (const sessionId of sessionIds) {
    expiredTotal += await processExpiredWaitlistOffersForSession(sessionId);
  }
  return expiredTotal;
}

async function loadSessionWaitlistDisplayBySessionId(userId, sessionIds, options = {}) {
  if (!options.skipExpiryProcessing) {
    await processExpiredWaitlistOffersForSessions(sessionIds);
  }
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, session_id, user_id, status, joined_at, expires_at")
    .in("session_id", sessionIds)
    .in("status", ["waiting", "offered"])
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadSessionWaitlistBookingAvailabilityBySessionId(sessionIds, options = {}) {
  if (!options.skipExpiryProcessing) {
    await processExpiredWaitlistOffersForSessions(sessionIds);
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("session_id, status, expires_at")
    .in("session_id", sessionIds)
    .in("status", ["waiting", "offered"]);
  if (error) throw new Error(error.message);
  return (data ?? []).filter(
    (row) => row.status !== "offered" || (row.expires_at && row.expires_at > now),
  );
}

async function loadMemberBookingDetailsBySessionId(userId, sessionIds) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, class_session_id, booking_status")
    .eq("user_id", userId)
    .in("class_session_id", sessionIds)
    .eq("booking_status", "booked");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadStudentPortalBookableSessionGroups(userId, clubId) {
  const { startIso, endIso } = getLondonDateRangeIso({ daysAhead: 14 });
  const innerTimings = {};

  const block1Start = performance.now();
  const [scheduleResult, allowedProgrammeIds] = await Promise.all([
    (async () => {
      const t = await time("loadClassScheduleSessions", () =>
        loadClassScheduleSessions({ startIso, endIso, clubId }, innerTimings),
      );
      innerTimings.loadClassScheduleSessions = t.ms;
      innerTimings.scheduleDetail = t.result;
      return t.result;
    })(),
    (async () => {
      const t = await time("loadStudentActiveProgrammeIdsForBooking", () =>
        loadStudentActiveProgrammeIdsForBooking(userId, clubId),
      );
      innerTimings.loadStudentActiveProgrammeIdsForBooking = t.ms;
      return t.result;
    })(),
  ]);
  innerTimings.block1WallMs = performance.now() - block1Start;

  const programmeIdByClass = scheduleResult.programmeIdByClassId;

  const bookableSessions =
    allowedProgrammeIds === null
      ? scheduleResult.sessions
      : scheduleResult.sessions.filter((session) => {
          const programmeId = programmeIdByClass.get(session.class_id);
          if (!programmeId) return true;
          return allowedProgrammeIds.has(programmeId);
        });

  innerTimings.sessionCount = bookableSessions.length;

  if (bookableSessions.length === 0) {
    return innerTimings;
  }

  const sessionIds = bookableSessions.map((s) => s.id);
  innerTimings.bookableSessionIds = sessionIds;
  innerTimings.queriesBeforeWaitlistBlock = queryCount;

  const waitlistLoaderOptions = { skipExpiryProcessing: true };
  const block2Start = performance.now();
  await Promise.all([
    loadMemberBookingDetailsBySessionId(userId, sessionIds),
    loadSessionWaitlistDisplayBySessionId(userId, sessionIds, waitlistLoaderOptions),
    loadSessionWaitlistBookingAvailabilityBySessionId(sessionIds, waitlistLoaderOptions),
  ]);
  innerTimings.block2WallMs = performance.now() - block2Start;
  innerTimings.queriesAfterWaitlistBlock = queryCount;
  innerTimings.totalQueries = queryCount;

  return innerTimings;
}

const STUDENT_MEMBERSHIP_ROLES = new Set(["student", "member"]);

function isStudentMembershipRole(role) {
  return role != null && STUDENT_MEMBERSHIP_ROLES.has(String(role).trim().toLowerCase());
}

function isActiveMembershipStatus(status) {
  return String(status ?? "").trim().toLowerCase() === "active";
}

async function loadUserClubMembership(userId, clubId) {
  trackQuery("memberships.byUserClub");
  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function userHasActiveStudentPortalAccessAtClubLegacy(userId, clubId) {
  const membership = await loadUserClubMembership(userId, clubId);
  if (!membership || !isActiveMembershipStatus(membership.status)) {
    return false;
  }
  if (!isStudentMembershipRole(membership.role)) {
    trackQuery("programme_memberships.byUser");
    const { data, error } = await supabase
      .from("programme_memberships")
      .select("programme_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    if (error) throw new Error(error.message);
    if ((data ?? []).length === 0) {
      return false;
    }
  }
  return true;
}

async function loadStudentPortalAccessibleClubsLegacyN1(userId) {
  trackQuery("memberships.withClubs.byUser");
  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(id, name, slug, is_active)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const clubs = [];
  for (const row of data ?? []) {
    if (!row.clubs || !isActiveMembershipStatus(row.status) || row.clubs.is_active === false) {
      continue;
    }
    const canAccess = await userHasActiveStudentPortalAccessAtClubLegacy(userId, row.clubs.id);
    if (canAccess) {
      clubs.push(row.clubs);
    }
  }
  return clubs;
}

async function loadPortalAccessProgrammeIds(clubId) {
  trackQuery("programmes.portalAccess.byClub");
  const { data, error } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId)
    .in("programme_type", ["bjj", "kids_bjj"]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

async function loadStudentPortalAccessibleClubsOptimized(userId) {
  trackQuery("memberships.withClubs.byUser");
  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(id, name, slug, is_active)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const candidates = [];
  for (const row of data ?? []) {
    if (!row.clubs || !isActiveMembershipStatus(row.status) || row.clubs.is_active === false) {
      continue;
    }
    candidates.push({ club: row.clubs, role: row.role, status: row.status });
  }

  const clubs = new Map();
  const clubsNeedingProgrammeCheck = [];

  for (const { club, role } of candidates) {
    if (isStudentMembershipRole(role)) {
      clubs.set(club.id, club);
      continue;
    }
    clubsNeedingProgrammeCheck.push(club.id);
  }

  if (clubsNeedingProgrammeCheck.length > 0) {
    const programmeIdsByClub = new Map();
    const allProgrammeIds = new Set();
    await Promise.all(
      clubsNeedingProgrammeCheck.map(async (clubId) => {
        const programmeIds = await loadPortalAccessProgrammeIds(clubId);
        if (programmeIds.length > 0) {
          programmeIdsByClub.set(clubId, programmeIds);
          for (const id of programmeIds) allProgrammeIds.add(id);
        }
      }),
    );

    if (allProgrammeIds.size > 0) {
      trackQuery("programme_memberships.batchByUser");
      const { data: programmeRows, error: programmeError } = await supabase
        .from("programme_memberships")
        .select("programme_id")
        .eq("user_id", userId)
        .in("programme_id", [...allProgrammeIds])
        .eq("status", "active");
      if (programmeError) throw new Error(programmeError.message);

      const activeProgrammeIds = new Set((programmeRows ?? []).map((row) => row.programme_id));
      for (const [clubId, programmeIds] of programmeIdsByClub.entries()) {
        if (programmeIds.some((id) => activeProgrammeIds.has(id))) {
          const club = candidates.find((entry) => entry.club.id === clubId)?.club;
          if (club) clubs.set(club.id, club);
        }
      }
    }
  }

  return [...clubs.values()];
}

async function profileAccessibleClubs(userId) {
  queryCount = 0;
  queryLog.length = 0;
  const legacyTimed = await time("loadStudentPortalAccessibleClubsLegacyN1", () =>
    loadStudentPortalAccessibleClubsLegacyN1(userId),
  );
  const legacyQueries = queryCount;

  queryCount = 0;
  queryLog.length = 0;
  const optimizedTimed = await time("loadStudentPortalAccessibleClubsOptimized", () =>
    loadStudentPortalAccessibleClubsOptimized(userId),
  );
  const optimizedQueries = queryCount;

  return {
    legacyMs: legacyTimed.ms,
    optimizedMs: optimizedTimed.ms,
    legacyQueries,
    optimizedQueries,
    legacyClubCount: legacyTimed.result.length,
    optimizedClubCount: optimizedTimed.result.length,
  };
}

async function resolveClubAndStudent() {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();
  if (clubError || !club) throw new Error(`Club not found: ${CLUB_SLUG}`);

  const { data: memberships, error: memError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", club.id)
    .eq("status", "active")
    .limit(5);
  if (memError) throw new Error(memError.message);

  const userId = memberships?.[0]?.user_id;
  if (!userId) throw new Error("No active member found for profiling");

  return { club, userId };
}

async function main() {
  const { club, userId } = await resolveClubAndStudent();
  console.log(`Profiling student portal book load`);
  console.log(`Club: ${club.slug} (${club.id})`);
  console.log(`Sample userId: ${userId}`);
  console.log("---");

  const accessibleClubsProfile = await profileAccessibleClubs(userId);
  console.log("\n=== Accessible clubs (N+1 fix) ===");
  console.log(
    `Legacy N+1 loadStudentPortalAccessibleClubs: ${accessibleClubsProfile.legacyQueries} queries, ${accessibleClubsProfile.legacyMs.toFixed(1)} ms`,
  );
  console.log(
    `Optimized batched loadStudentPortalAccessibleClubs: ${accessibleClubsProfile.optimizedQueries} queries, ${accessibleClubsProfile.optimizedMs.toFixed(1)} ms`,
  );
  console.log(
    `Clubs returned (legacy vs optimized): ${accessibleClubsProfile.legacyClubCount} vs ${accessibleClubsProfile.optimizedClubCount}`,
  );
  const savedAccessibleQueries =
    accessibleClubsProfile.legacyQueries - accessibleClubsProfile.optimizedQueries;
  console.log(
    `Per-call query savings: ${savedAccessibleQueries} (${savedAccessibleQueries > 0 ? "fewer" : "same"} on single load)`,
  );
  console.log(
    `React.cache (not measured here): ~5 duplicate accessible-clubs calls per Book page → 1 (~${savedAccessibleQueries * 4} fewer queries estimated)`,
  );

  queryCount = 0;
  queryLog.length = 0;

  const totalTimed = await time("loadStudentPortalBookableSessionGroups", () =>
    loadStudentPortalBookableSessionGroups(userId, club.id),
  );

  const r = totalTimed.result;

  let waitlistSinglePassMs = null;
  let waitlistDoublePassWallMs = null;
  if (r.sessionCount > 0 && r.bookableSessionIds?.length) {
    const bookableIds = r.bookableSessionIds;

    const single = await time("waitlistExpirySinglePass", () =>
      processExpiredWaitlistOffersForSessions(bookableIds),
    );
    waitlistSinglePassMs = single.ms;

    const doubleStart = performance.now();
    await Promise.all([
      processExpiredWaitlistOffersForSessions(bookableIds),
      processExpiredWaitlistOffersForSessions(bookableIds),
    ]);
    waitlistDoublePassWallMs = performance.now() - doubleStart;
  }

  const scheduleExEnsure =
    (r.loadClassScheduleSessions ?? 0) - (r.ensureClubRecurringFutureSessions ?? 0);
  const waitlistBlockQueries =
    (r.queriesAfterWaitlistBlock ?? 0) - (r.queriesBeforeWaitlistBlock ?? 0);
  const waitlistExpiryQueriesEstimate = Math.round(waitlistBlockQueries * 0.85);

  console.log("\n=== Timings (ms) ===");
  console.log(
    `1. loadStudentPortalBookableSessionGroups (total): ${totalTimed.ms.toFixed(1)}`,
  );
  console.log(
    `   Block 1 wall (schedule + programme in parallel): ${(r.block1WallMs ?? 0).toFixed(1)}`,
  );
  console.log(
    `2. loadClassScheduleSessions (incl. ensure):        ${(r.loadClassScheduleSessions ?? 0).toFixed(1)}`,
  );
  console.log(
    `   └ ensureClubRecurringFutureSessions:              ${(r.ensureClubRecurringFutureSessions ?? 0).toFixed(1)}`,
  );
  console.log(
    `   └ schedule queries excl. ensure (approx):       ${scheduleExEnsure.toFixed(1)}`,
  );
  console.log(
    `3. loadStudentActiveProgrammeIdsForBooking:        ${(r.loadStudentActiveProgrammeIdsForBooking ?? 0).toFixed(1)}`,
  );
  console.log(
    `4. Block 2 wall (member + 2 waitlist loaders):      ${(r.block2WallMs ?? 0).toFixed(1)}`,
  );
  if (waitlistSinglePassMs != null) {
    console.log(
      `5. waitlist expiry — single pass (isolated):       ${waitlistSinglePassMs.toFixed(1)}`,
    );
    console.log(
      `   waitlist expiry — dual pass wall (isolated):    ${waitlistDoublePassWallMs.toFixed(1)}`,
    );
  }

  if (r.ensureDetail) {
    console.log("\n=== ensureClubRecurringFutureSessions detail ===");
    console.log(`Active recurring schedules: ${r.ensureDetail.scheduleCount}`);
    console.log(`RPC generate_recurring_class_sessions calls: ${r.ensureDetail.rpcCalls}`);
  }

  console.log("\n=== Data volume ===");
  console.log(`Bookable sessions shown to student: ${r.sessionCount ?? 0}`);
  if (r.scheduleDetail) {
    console.log(`Sessions after active-class filter: ${r.scheduleDetail.sessions?.length ?? 0}`);
    console.log(`Session attendee rows fetched: ${r.scheduleDetail.attendeeRows ?? 0}`);
  }

  console.log("\n=== Supabase query count (instrumented, production path) ===");
  console.log(`Total queries for loadStudentPortalBookableSessionGroups: ${r.totalQueries ?? 0}`);
  console.log(`Queries before waitlist block: ${r.queriesBeforeWaitlistBlock ?? 0}`);
  console.log(`Queries in waitlist block (read-only, no expiry): ${waitlistBlockQueries}`);
  if (waitlistSinglePassMs != null) {
    console.log(
      `Isolated waitlist expiry cost (not on book page load): ${waitlistSinglePassMs.toFixed(1)} ms`,
    );
    console.log(
      `Estimated expiry queries if still on book load (~85% of isolated pass): ${waitlistExpiryQueriesEstimate}`,
    );
  }

  console.log("\n=== Biggest contributor (wall time) ===");
  const parts = [
    {
      name: "waitlist block (2 loaders incl. 2× expiry, parallel wall)",
      ms: r.block2WallMs ?? 0,
    },
    {
      name: "loadClassScheduleSessions (incl. ensure)",
      ms: r.loadClassScheduleSessions ?? 0,
    },
    {
      name: "ensureClubRecurringFutureSessions (subset of schedule)",
      ms: r.ensureClubRecurringFutureSessions ?? 0,
    },
    {
      name: "loadStudentActiveProgrammeIdsForBooking",
      ms: r.loadStudentActiveProgrammeIdsForBooking ?? 0,
    },
  ].sort((a, b) => b.ms - a.ms);
  console.log(`Winner: ${parts[0].name} — ${parts[0].ms.toFixed(1)} ms`);

  console.log("\n=== Page-level context (React.cache in app; estimates) ===");
  console.log(
    "requireStudentPortalPageContext runs twice per navigation (metadata + page); layout adds a third session pass.",
  );
  console.log(
    `Accessible clubs: legacy ~${accessibleClubsProfile.legacyQueries} queries × 5 logical calls → optimized ~${accessibleClubsProfile.optimizedQueries} × 1 with cache.`,
  );
  console.log(
    "Also deduped per request: getClubBySlug, userHasActiveStudentPortalAccessAtClub, hasAcceptedCurrentStudentAgreements, session auth.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
