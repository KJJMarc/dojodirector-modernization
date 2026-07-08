/**
 * Restore accidentally deleted Kingston leads for Jake West Gomila and Jack Jeffery.
 *
 * Data reconstructed from surviving guest_bookings, session_attendees, users, and memberships.
 *
 * Usage:
 *   node frontend/scripts/restore-jake-west-gomila-jack-jeffery-leads.mjs --dry-run
 *   node frontend/scripts/restore-jake-west-gomila-jack-jeffery-leads.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const text = readFileSync(join(__dirname, "../.env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const KINGSTON_ACADEMY_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";

/** @type {const} */
const RESTORATIONS = [
  {
    fullName: "Jake West Gomila",
    email: "jwestgomila@gmail.com",
    phone: "+447794593601",
    programmeInterest: "bjj",
    experienceLevel: "not_sure",
    leadSource: "website",
    status: "joined",
    submittedAt: "2026-06-19T06:38:47.990134+00:00",
    trialBookedAt: "2026-06-19T06:38:47.990134+00:00",
    trialAttendedAt: "2026-06-24T19:00:00+00:00",
    joinedAt: "2026-07-01T18:02:01.693451+00:00",
    createdAt: "2026-06-19T06:38:47.990134+00:00",
    lastActivityAt: "2026-07-01T18:02:01.693451+00:00",
    guestBookingId: "9ceb06a9-afb7-4bdb-8820-7d394a6805b9",
    userId: "57d73a0b-0e80-4008-9697-0ef953e62174",
    notes: [
      "[19 Jun 2026, 07:38] Guest booked a trial class: No-Gi Grappling — Tue, 24 Jun 2026, 20:00",
      "[1 Jul 2026, 19:02] Converted to student: Jake West-Gomila",
      "[8 Jul 2026, 21:30] Lead record recreated from guest booking and membership data after accidental deletion.",
    ].join("\n\n"),
  },
  {
    fullName: "Jack Jeffery",
    email: "j.jeff23@pm.me",
    phone: "07913895810",
    programmeInterest: "bjj",
    experienceLevel: "not_sure",
    leadSource: "referral",
    status: "joined",
    submittedAt: "2026-06-22T14:35:50.78139+00:00",
    trialBookedAt: "2026-06-22T14:35:50.78139+00:00",
    trialAttendedAt: "2026-06-22T17:00:00+00:00",
    joinedAt: "2026-06-26T09:51:01.786436+00:00",
    createdAt: "2026-06-22T14:35:50.78139+00:00",
    lastActivityAt: "2026-06-26T09:51:01.786436+00:00",
    guestBookingId: "5aaacdf3-917f-4eff-8fc4-fd0fda390c13",
    userId: "47fff67f-cc4a-4ccb-bd4d-b2d2cf811cec",
    notes: [
      "[22 Jun 2026, 15:35] Guest booked a trial class: Beginners Jiu Jitsu — Sun, 22 Jun 2026, 18:00",
      "[26 Jun 2026, 10:51] Converted to student: Jack Jeffery",
      "[8 Jul 2026, 21:30] Lead record recreated from guest booking and membership data after accidental deletion.",
    ].join("\n\n"),
  },
];

async function loadExistingLead(supabase, email) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name, email, status, archived_at, created_at")
    .eq("academy_id", KINGSTON_ACADEMY_ID)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing lead for ${email}: ${error.message}`);
  }

  return data;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(dryRun ? "DRY RUN — no writes\n" : "Applying lead restorations\n");

  for (const lead of RESTORATIONS) {
    const existing = await loadExistingLead(supabase, lead.email);

    if (existing) {
      console.log(`SKIP ${lead.fullName}: lead already exists (${existing.id}, status=${existing.status})`);
      continue;
    }

    const insertRow = {
      academy_id: KINGSTON_ACADEMY_ID,
      full_name: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      programme_interest: lead.programmeInterest,
      experience_level: lead.experienceLevel,
      lead_source: lead.leadSource,
      status: lead.status,
      notes: lead.notes,
      created_at: lead.createdAt,
      updated_at: lead.lastActivityAt,
      submitted_at: lead.submittedAt,
      trial_booked_at: lead.trialBookedAt,
      trial_attended_at: lead.trialAttendedAt,
      joined_at: lead.joinedAt,
      last_activity_at: lead.lastActivityAt,
      archived_at: null,
    };

    console.log(`RESTORE ${lead.fullName} <${lead.email}>`);
    console.log(JSON.stringify(insertRow, null, 2));

    if (dryRun) {
      continue;
    }

    const { data, error } = await supabase.from("leads").insert(insertRow).select("id").single();

    if (error) {
      throw new Error(`Failed to restore lead for ${lead.email}: ${error.message}`);
    }

    console.log(`  -> inserted lead ${data.id}`);
  }

  console.log("\nVerification:");
  for (const lead of RESTORATIONS) {
    const restored = await loadExistingLead(supabase, lead.email);
    console.log(
      restored
        ? `  OK ${lead.fullName}: ${restored.id} (${restored.status})`
        : `  MISSING ${lead.fullName}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
