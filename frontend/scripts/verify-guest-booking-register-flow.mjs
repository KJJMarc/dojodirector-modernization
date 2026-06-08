#!/usr/bin/env node
/**
 * Verifies guest bookings are linked to session_attendees for register/cancel flows.
 *
 * Usage: node scripts/verify-guest-booking-register-flow.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLUB_SLUG = process.env.PROFILE_CLUB_SLUG ?? "kingston-jiu-jitsu";

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

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(0);
  return !error;
}

async function main() {
  const hasGuestBookingIdColumn = await columnExists(
    "session_attendees",
    "guest_booking_id",
  );
  assert(
    hasGuestBookingIdColumn,
    "session_attendees.guest_booking_id column exists (run migration first)",
  );

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();
  if (clubError || !club) throw new Error(`Club not found: ${CLUB_SLUG}`);

  const { data: guestBookings, error: guestError } = await supabase
    .from("guest_bookings")
    .select("id, session_id, booking_status")
    .eq("club_id", club.id)
    .eq("booking_status", "booked")
    .order("created_at", { ascending: false })
    .limit(20);
  if (guestError) throw new Error(guestError.message);

  const bookedGuests = guestBookings ?? [];
  console.log(`Found ${bookedGuests.length} active guest booking(s) for ${CLUB_SLUG}.`);

  if (bookedGuests.length === 0) {
    console.log("No active guest bookings to verify — create one via /book first.");
    return;
  }

  const guestIds = bookedGuests.map((row) => row.id);
  const { data: registerRows, error: registerError } = await supabase
    .from("session_attendees")
    .select("id, class_session_id, guest_booking_id, booking_status, user_id")
    .in("guest_booking_id", guestIds);
  if (registerError) throw new Error(registerError.message);

  const registerByGuestId = new Map(
    (registerRows ?? []).map((row) => [row.guest_booking_id, row]),
  );

  for (const guest of bookedGuests) {
    const registerRow = registerByGuestId.get(guest.id);
    assert(Boolean(registerRow), `Guest ${guest.id} has a session_attendees register row`);
    assert(
      registerRow.booking_status === "booked",
      `Guest ${guest.id} register row is booked`,
    );
    assert(
      registerRow.class_session_id === guest.session_id,
      `Guest ${guest.id} register row matches session`,
    );
    assert(
      registerRow.user_id == null,
      `Guest ${guest.id} register row has no user_id`,
    );
  }

  console.log("Guest booking register linkage verified.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
