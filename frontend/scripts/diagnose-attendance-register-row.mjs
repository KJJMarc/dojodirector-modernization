#!/usr/bin/env node
/**
 * Diagnose a student row on the attendance register (duplicate bookings, missing ids, etc.).
 *
 * Usage:
 *   node scripts/diagnose-attendance-register-row.mjs "Freya Toomey-Layne"
 *   node scripts/diagnose-attendance-register-row.mjs --session-id <uuid>
 *   node scripts/diagnose-attendance-register-row.mjs "Freya" --session-id <uuid>
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

const nameQuery = process.argv.find((arg) => !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1]);
const sessionIdArgIndex = process.argv.indexOf("--session-id");
const sessionIdFilter =
  sessionIdArgIndex !== -1 ? process.argv[sessionIdArgIndex + 1] : null;

if (!nameQuery && !sessionIdFilter) {
  console.error(
    'Usage: node scripts/diagnose-attendance-register-row.mjs "<student name>" [--session-id <uuid>]',
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function fullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
}

async function main() {
  let users = [];

  if (nameQuery) {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, portal_login_email")
      .or(
        `first_name.ilike.%${nameQuery}%,last_name.ilike.%${nameQuery}%`,
      );

    if (error) {
      console.error("User lookup failed:", error.message);
      process.exit(1);
    }

    users = (data ?? []).filter((user) =>
      fullName(user).toLowerCase().includes(nameQuery.toLowerCase()),
    );
  }

  if (users.length === 0 && sessionIdFilter) {
    const { data: attendees, error } = await supabase
      .from("session_attendees")
      .select(
        "id, user_id, guest_booking_id, class_session_id, attendance_status, users(first_name, last_name, email)",
      )
      .eq("class_session_id", sessionIdFilter);

    if (error) {
      console.error("Session attendee lookup failed:", error.message);
      process.exit(1);
    }

    console.log(JSON.stringify({ sessionId: sessionIdFilter, attendees }, null, 2));
    return;
  }

  if (users.length === 0) {
    console.log("No users matched:", nameQuery);
    return;
  }

  for (const user of users) {
    console.log("\n=== User ===");
    console.log({
      id: user.id,
      name: fullName(user),
      email: user.email ?? user.portal_login_email,
    });

    let attendeeQuery = supabase
      .from("session_attendees")
      .select(
        "id, user_id, guest_booking_id, class_session_id, attendance_status, created_at, class_sessions(starts_at, club_id, status, classes(name))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (sessionIdFilter) {
      attendeeQuery = attendeeQuery.eq("class_session_id", sessionIdFilter);
    }

    const { data: attendees, error: attendeeError } = await attendeeQuery;

    if (attendeeError) {
      console.error("session_attendees error:", attendeeError.message);
      continue;
    }

    const rows = attendees ?? [];
    const bySession = new Map();
    for (const row of rows) {
      const key = row.class_session_id;
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key).push(row);
    }

    console.log("\n--- session_attendees (recent) ---");
    for (const row of rows) {
      const session = Array.isArray(row.class_sessions)
        ? row.class_sessions[0]
        : row.class_sessions;
      const className = Array.isArray(session?.classes)
        ? session?.classes[0]?.name
        : session?.classes?.name;
      console.log({
        attendeeId: row.id,
        sessionId: row.class_session_id,
        status: row.attendance_status,
        guestBookingId: row.guest_booking_id,
        startsAt: session?.starts_at,
        className,
        sessionStatus: session?.status,
      });
    }

    const duplicateSessions = [...bySession.entries()].filter(
      ([, group]) => group.length > 1,
    );
    if (duplicateSessions.length > 0) {
      console.log("\n⚠️  DUPLICATE session_attendees for same session:");
      for (const [sessionId, group] of duplicateSessions) {
        console.log({ sessionId, attendeeIds: group.map((r) => r.id) });
      }
    }

    const sessionIds = [...new Set(rows.map((r) => r.class_session_id))];
    if (sessionIds.length > 0) {
      const { data: records, error: recordError } = await supabase
        .from("attendance_records")
        .select("id, class_session_id, attended_on, attended_at, source")
        .eq("user_id", user.id)
        .in("class_session_id", sessionIds);

      if (recordError) {
        console.error("attendance_records error:", recordError.message);
      } else {
        console.log("\n--- attendance_records for those sessions ---");
        for (const record of records ?? []) {
          console.log(record);
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
