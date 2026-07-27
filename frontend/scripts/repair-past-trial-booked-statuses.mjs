#!/usr/bin/env node
/**
 * Fix past Trial Booked leads → Trial Attended / Trial Missed.
 *
 * 1. Backfill guest_bookings.lead_id (email, then phone, same academy)
 * 2. Repair statuses from register Present/Absent (includes archived leads)
 * 3. Sweep remaining past trial_booked → trial_missed
 *
 * Usage:
 *   node frontend/scripts/repair-past-trial-booked-statuses.mjs --dry-run
 *   node frontend/scripts/repair-past-trial-booked-statuses.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normEmail(value) {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed && trimmed.includes("@") ? trimmed : null;
}

function phoneDigits(value) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function normName(first, last) {
  const full = [first, last]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return full || null;
}

function normSingleName(value) {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return trimmed || null;
}

function londonDateKey(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function daysBetweenLondon(fromKey, toKey) {
  const a = Date.parse(`${fromKey}T12:00:00.000Z`);
  const b = Date.parse(`${toKey}T12:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

function formatLondon(iso) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const markedLabel = `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
  const sessionDateLabel = `${get("day")} ${get("month")} ${get("year")}`;
  return { markedLabel, sessionDateLabel };
}

function appendNote(existingNotes, line) {
  const trimmed = (existingNotes ?? "").trim();
  return trimmed ? `${trimmed}\n\n${line}` : line;
}

async function fetchAll(buildQuery) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchByIds(table, columns, ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    if (!chunk.length) continue;
    const { data, error } = await supabase.from(table).select(columns).in("id", chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

function leadMatchesRegisterRow(lead, row) {
  const leadEmail = normEmail(lead.email);
  const leadPhone = phoneDigits(lead.phone);
  const leadName = normSingleName(lead.full_name);

  if (row.isMemberRow) {
    if (row.memberEmail && leadEmail === row.memberEmail) return "member_email";
    if (row.memberPhone && leadPhone && leadPhone === row.memberPhone) return "member_phone";
    if (row.memberName && leadName === row.memberName) return "member_name";
    return null;
  }

  if (row.isGuestRow) {
    if (row.guestEmail && leadEmail === row.guestEmail) return "guest_email";
    if (row.guestPhone && leadPhone && leadPhone === row.guestPhone) return "guest_phone";
    if (row.guestName && leadName === row.guestName) return "guest_name";
    if (row.guestParticipantName && leadName === row.guestParticipantName) {
      return "guest_participant_name";
    }
    return null;
  }

  return null;
}

function pickOldestLead(matches) {
  return [...matches].sort(
    (a, b) => Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
  )[0];
}

async function backfillLeadLinks() {
  console.log("\n=== 1. Backfill guest_bookings.lead_id ===");

  const bookings = await fetchAll((from, to) =>
    supabase
      .from("guest_bookings")
      .select("id, club_id, email, phone, lead_id, created_at")
      .is("lead_id", null)
      .range(from, to),
  );

  const leads = await fetchAll((from, to) =>
    supabase
      .from("leads")
      .select("id, academy_id, email, phone, created_at, full_name")
      .range(from, to),
  );

  const leadsByAcademy = new Map();
  for (const lead of leads) {
    const list = leadsByAcademy.get(lead.academy_id) ?? [];
    list.push(lead);
    leadsByAcademy.set(lead.academy_id, list);
  }

  const updates = [];
  for (const booking of bookings) {
    const academyLeads = leadsByAcademy.get(booking.club_id) ?? [];
    const email = normEmail(booking.email);
    const phone = phoneDigits(booking.phone);

    let matched = null;
    let method = null;

    if (email) {
      const emailMatches = academyLeads.filter((lead) => normEmail(lead.email) === email);
      matched = pickOldestLead(emailMatches);
      if (matched) method = "email";
    }

    if (!matched && phone) {
      const phoneMatches = academyLeads.filter((lead) => phoneDigits(lead.phone) === phone);
      matched = pickOldestLead(phoneMatches);
      if (matched) method = "phone";
    }

    if (!matched) continue;

    updates.push({ bookingId: booking.id, leadId: matched.id, method, leadName: matched.full_name });
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Link updates: ${updates.length} of ${bookings.length} unlinked bookings`);

  for (const update of updates.slice(0, 20)) {
    console.log(`  link ${update.method}: booking → ${update.leadName}`);
  }
  if (updates.length > 20) console.log(`  ... and ${updates.length - 20} more`);

  if (!dryRun) {
    for (const update of updates) {
      const { error } = await supabase
        .from("guest_bookings")
        .update({ lead_id: update.leadId })
        .eq("id", update.bookingId)
        .is("lead_id", null);
      if (error) throw new Error(`Link failed for booking ${update.bookingId}: ${error.message}`);
    }
  }

  return updates.length;
}

async function repairFromRegister() {
  console.log("\n=== 2. Repair from register Present / Absent ===");

  const attendees = await fetchAll((from, to) =>
    supabase
      .from("session_attendees")
      .select("id, attendance_status, user_id, guest_booking_id, class_session_id")
      .in("attendance_status", ["present", "absent"])
      .range(from, to),
  );

  const sessionIds = [...new Set(attendees.map((row) => row.class_session_id))];
  const userIds = [...new Set(attendees.map((row) => row.user_id).filter(Boolean))];
  const guestIds = [...new Set(attendees.map((row) => row.guest_booking_id).filter(Boolean))];

  const sessions = await fetchByIds(
    "class_sessions",
    "id, club_id, starts_at, status, class_id, classes(name)",
    sessionIds,
  );
  const users = await fetchByIds(
    "users",
    "id, email, portal_login_email, phone, first_name, last_name",
    userIds,
  );
  const guests = await fetchByIds(
    "guest_bookings",
    "id, email, phone, first_name, last_name, participant_name, lead_id",
    guestIds,
  );

  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const userById = new Map(users.map((row) => [row.id, row]));
  const guestById = new Map(guests.map((row) => [row.id, row]));

  const registerRows = [];
  for (const attendee of attendees) {
    const session = sessionById.get(attendee.class_session_id);
    if (!session || session.status === "cancelled") continue;

    const user = attendee.user_id ? userById.get(attendee.user_id) : null;
    const guest = attendee.guest_booking_id ? guestById.get(attendee.guest_booking_id) : null;
    const className = session.classes?.name?.trim() || "Class";

    registerRows.push({
      attendanceStatus: attendee.attendance_status,
      academyId: session.club_id,
      markedAt: session.starts_at,
      className,
      guestLeadId: guest?.lead_id ?? null,
      isMemberRow: Boolean(attendee.user_id),
      isGuestRow: Boolean(attendee.guest_booking_id),
      memberEmail: normEmail(user?.email || user?.portal_login_email),
      memberPhone: phoneDigits(user?.phone),
      memberName: user ? normName(user.first_name, user.last_name) : null,
      guestEmail: normEmail(guest?.email),
      guestPhone: phoneDigits(guest?.phone),
      guestName: guest ? normName(guest.first_name, guest.last_name) : null,
      guestParticipantName: normSingleName(guest?.participant_name),
    });
  }

  // Include archived leads (plan: clean history including Aadam Sheikh)
  const leads = await fetchAll((from, to) =>
    supabase
      .from("leads")
      .select(
        "id, academy_id, full_name, email, phone, status, trial_attended_at, notes, last_activity_at, archived_at",
      )
      .neq("status", "joined")
      .range(from, to),
  );

  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const matches = [];

  for (const lead of leads) {
    for (const row of registerRows) {
      if (lead.academy_id !== row.academyId) continue;

      let method = null;
      if (row.guestLeadId && row.guestLeadId === lead.id) {
        method = "guest_lead_id";
      } else {
        method = leadMatchesRegisterRow(lead, row);
      }
      if (!method) continue;

      matches.push({ leadId: lead.id, lead, method, ...row });
    }
  }

  const eligibleStatuses = new Set([
    "new_enquiry",
    "trial_booked",
    "trial_missed",
    "new",
    "contacted",
  ]);

  const bestPresentByLead = new Map();
  for (const match of matches.filter((row) => row.attendanceStatus === "present")) {
    const lead = match.lead;
    if (lead.trial_attended_at) continue;
    if (!eligibleStatuses.has(lead.status) && lead.status !== "trial_attended") continue;
    const existing = bestPresentByLead.get(match.leadId);
    if (!existing || new Date(match.markedAt) > new Date(existing.markedAt)) {
      bestPresentByLead.set(match.leadId, match);
    }
  }

  const presentLeadIds = new Set(bestPresentByLead.keys());
  const bestAbsentByLead = new Map();
  for (const match of matches.filter((row) => row.attendanceStatus === "absent")) {
    const lead = match.lead;
    if (lead.trial_attended_at) continue;
    if (!eligibleStatuses.has(lead.status)) continue;
    if (presentLeadIds.has(match.leadId)) continue;
    const existing = bestAbsentByLead.get(match.leadId);
    if (!existing || new Date(match.markedAt) > new Date(existing.markedAt)) {
      bestAbsentByLead.set(match.leadId, match);
    }
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Present → trial_attended: ${bestPresentByLead.size}`);
  for (const match of bestPresentByLead.values()) {
    console.log(
      `  present → attended: ${match.lead.full_name} (${match.lead.archived_at ? "archived" : "active"}) via ${match.method}`,
    );
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Absent → trial_missed: ${bestAbsentByLead.size}`);
  for (const match of bestAbsentByLead.values()) {
    if (!["new_enquiry", "trial_booked", "new", "contacted"].includes(match.lead.status)) continue;
    console.log(
      `  absent → missed: ${match.lead.full_name} (${match.lead.archived_at ? "archived" : "active"})`,
    );
  }

  if (!dryRun) {
    for (const match of bestPresentByLead.values()) {
      const { markedLabel, sessionDateLabel } = formatLondon(match.markedAt);
      const noteLine = `[${markedLabel}] Trial attendance recorded (register backfill): ${match.className} — ${sessionDateLabel}`;
      const { error } = await supabase
        .from("leads")
        .update({
          status: "trial_attended",
          trial_attended_at: match.markedAt,
          last_activity_at: match.markedAt,
          updated_at: new Date().toISOString(),
          notes: appendNote(match.lead.notes, noteLine),
        })
        .eq("id", match.leadId)
        .is("trial_attended_at", null);
      if (error) throw new Error(`Present update failed for ${match.leadId}: ${error.message}`);
    }

    const absentApplyStatuses = ["new_enquiry", "trial_booked", "new", "contacted"];
    for (const match of bestAbsentByLead.values()) {
      if (!absentApplyStatuses.includes(match.lead.status)) continue;
      const { markedLabel, sessionDateLabel } = formatLondon(match.markedAt);
      const noteLine = `[${markedLabel}] Trial missed on register (register backfill): ${match.className} — ${sessionDateLabel}`;
      const { error } = await supabase
        .from("leads")
        .update({
          status: "trial_missed",
          last_activity_at: match.markedAt,
          updated_at: new Date().toISOString(),
          notes: appendNote(match.lead.notes, noteLine),
        })
        .eq("id", match.leadId)
        .in("status", absentApplyStatuses);
      if (error) throw new Error(`Absent update failed for ${match.leadId}: ${error.message}`);
    }
  }

  return {
    present: bestPresentByLead.size,
    absent: [...bestAbsentByLead.values()].filter((m) =>
      ["new_enquiry", "trial_booked", "new", "contacted"].includes(m.lead.status),
    ).length,
    presentLeadIds: new Set(bestPresentByLead.keys()),
  };
}

async function loadLinkedSessionStartsByLeadId(leadIds) {
  const result = new Map();
  if (!leadIds.length) return result;

  for (let i = 0; i < leadIds.length; i += 200) {
    const chunk = leadIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("guest_bookings")
      .select("lead_id, created_at, session_id, class_sessions(starts_at)")
      .in("lead_id", chunk)
      .eq("booking_status", "booked")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Linked sessions: ${error.message}`);

    for (const row of data ?? []) {
      if (!row.lead_id || result.has(row.lead_id)) continue;
      const sessionRelation = row.class_sessions;
      const session = Array.isArray(sessionRelation) ? sessionRelation[0] : sessionRelation;
      if (session?.starts_at) result.set(row.lead_id, session.starts_at);
    }
  }

  return result;
}

async function sweepPastTrialBooked(skipLeadIds = new Set()) {
  console.log("\n=== 3. Sweep remaining past trial_booked → trial_missed ===");

  const leads = await fetchAll((from, to) =>
    supabase
      .from("leads")
      .select(
        "id, full_name, email, status, trial_booked_at, trial_attended_at, notes, archived_at, academy_id",
      )
      .eq("status", "trial_booked")
      .range(from, to),
  );

  const linkedSessions = await loadLinkedSessionStartsByLeadId(leads.map((lead) => lead.id));
  const todayKey = londonDateKey(new Date().toISOString());
  const nowIso = new Date().toISOString();
  const { markedLabel } = formatLondon(nowIso);

  const toMiss = [];
  const keepBooked = [];

  for (const lead of leads) {
    if (skipLeadIds.has(lead.id)) continue;
    if (lead.trial_attended_at) {
      // Status lag: attended timestamp exists but status still trial_booked
      if (!dryRun) {
        const { error } = await supabase
          .from("leads")
          .update({ status: "trial_attended", updated_at: nowIso })
          .eq("id", lead.id)
          .eq("status", "trial_booked")
          .not("trial_attended_at", "is", null);
        if (error) throw new Error(`Align attended status failed for ${lead.id}: ${error.message}`);
      }
      console.log(`  align → attended: ${lead.full_name} (had trial_attended_at)`);
      continue;
    }

    const sessionStartsAt = linkedSessions.get(lead.id) ?? null;
    const anchorIso = sessionStartsAt ?? lead.trial_booked_at;
    if (!anchorIso) {
      keepBooked.push({ lead, reason: "no_date" });
      continue;
    }

    const dateKey = londonDateKey(anchorIso);
    const ageDays = daysBetweenLondon(dateKey, todayKey);

    if (ageDays > 0) {
      toMiss.push({
        lead,
        dateKey,
        ageDays,
        usedLinkedSession: Boolean(sessionStartsAt),
      });
    } else {
      keepBooked.push({ lead, reason: ageDays === 0 ? "today" : "future", dateKey });
    }
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Past trial_booked → trial_missed: ${toMiss.length}`);
  for (const row of toMiss) {
    console.log(
      `  miss: ${row.lead.full_name} | day ${row.dateKey} (${row.ageDays}d ago, ${row.usedLinkedSession ? "session" : "trial_booked_at"}) | ${row.lead.archived_at ? "archived" : "active"}`,
    );
  }

  console.log(`Keeping trial_booked (today/future/no date): ${keepBooked.length}`);
  for (const row of keepBooked) {
    console.log(`  keep: ${row.lead.full_name} | ${row.reason}${row.dateKey ? ` ${row.dateKey}` : ""}`);
  }

  if (!dryRun) {
    for (const row of toMiss) {
      const noteLine = `[${markedLabel}] Trial missed (past-trial sweep): no attended mark after trial date ${row.dateKey}`;
      const { error } = await supabase
        .from("leads")
        .update({
          status: "trial_missed",
          last_activity_at: nowIso,
          updated_at: nowIso,
          notes: appendNote(row.lead.notes, noteLine),
        })
        .eq("id", row.lead.id)
        .eq("status", "trial_booked");
      if (error) throw new Error(`Sweep failed for ${row.lead.id}: ${error.message}`);
    }
  }

  return { missed: toMiss.length, kept: keepBooked.length };
}

async function verify() {
  console.log("\n=== 4. Verify ===");

  const booked = await fetchAll((from, to) =>
    supabase
      .from("leads")
      .select("id, full_name, status, trial_booked_at, archived_at, academy_id")
      .eq("status", "trial_booked")
      .range(from, to),
  );

  const linkedSessions = await loadLinkedSessionStartsByLeadId(booked.map((lead) => lead.id));
  const todayKey = londonDateKey(new Date().toISOString());

  const activeBooked = booked.filter((lead) => !lead.archived_at);
  const pastActive = [];
  const okActive = [];

  for (const lead of activeBooked) {
    const anchor = linkedSessions.get(lead.id) ?? lead.trial_booked_at;
    if (!anchor) {
      okActive.push(lead);
      continue;
    }
    const age = daysBetweenLondon(londonDateKey(anchor), todayKey);
    if (age > 0) pastActive.push(lead);
    else okActive.push(lead);
  }

  const { count: missedCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "trial_missed");

  const { count: linkedCount } = await supabase
    .from("guest_bookings")
    .select("id", { count: "exact", head: true })
    .not("lead_id", "is", null);

  console.log({
    trial_booked_total: booked.length,
    trial_booked_active: activeBooked.length,
    trial_booked_active_past_unexpected: pastActive.length,
    trial_booked_active_today_or_future: okActive.length,
    trial_missed_total: missedCount,
    guest_bookings_with_lead_id: linkedCount,
  });

  if (pastActive.length) {
    console.log("UNEXPECTED still-past active trial_booked:");
    for (const lead of pastActive) console.log(`  - ${lead.full_name}`);
  }

  for (const lead of okActive) {
    console.log(`  ok trial_booked: ${lead.full_name}`);
  }

  // Spot-check Aadam
  const { data: aadam } = await supabase
    .from("leads")
    .select("id, full_name, status, archived_at, trial_booked_at, trial_attended_at")
    .ilike("full_name", "%Aadam Sheikh%")
    .limit(3);
  console.log("Aadam Sheikh:", aadam);

  return pastActive.length === 0;
}

async function main() {
  console.log(dryRun ? "DRY RUN — no writes" : "APPLYING repairs");

  const linked = await backfillLeadLinks();
  const register = await repairFromRegister();
  const sweep = await sweepPastTrialBooked(register.presentLeadIds);
  const ok = await verify();

  console.log("\nSummary:", { linked, register, sweep, verifyOk: ok });
  console.log(dryRun ? "\nDry run complete." : "\nRepair applied.");

  if (!dryRun && !ok) process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
