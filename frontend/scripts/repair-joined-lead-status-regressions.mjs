/**
 * Repair joined leads downgraded by post-join guest trial activity.
 *
 * Usage:
 *   node frontend/scripts/repair-joined-lead-status-regressions.mjs --dry-run
 *   node frontend/scripts/repair-joined-lead-status-regressions.mjs
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
const REPAIRS = [
  {
    leadId: "5fd80ac1-4564-4e8d-9e5a-495e43729d3c",
    fullName: "Matt Houghton",
    setStatusJoined: true,
    note:
      "[8 Jul 2026, 21:40] Lead status corrected to joined after post-join guest trial activity.",
  },
  {
    leadId: "d099c516-5418-456f-a0f8-313b2b11005f",
    fullName: "Jake West Gomila",
    setStatusJoined: false,
    note: null,
  },
  {
    leadId: "70d3e02e-bbd7-4e03-86da-50bddc94242a",
    fullName: "Jack Jeffery",
    setStatusJoined: false,
    note: null,
  },
];

function appendNote(existingNotes, entry) {
  const trimmedEntry = entry.trim();
  const trimmedExisting = existingNotes?.trim() ?? "";
  if (!trimmedEntry) return trimmedExisting || null;
  if (!trimmedExisting) return trimmedEntry;
  return `${trimmedExisting}\n\n${trimmedEntry}`;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();

  console.log(dryRun ? "DRY RUN\n" : "Applying repairs\n");

  for (const repair of REPAIRS) {
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, full_name, email, status, joined_at, notes")
      .eq("id", repair.leadId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load ${repair.fullName}: ${error.message}`);
    }

    if (!lead) {
      console.log(`MISSING ${repair.fullName}`);
      continue;
    }

    const update = {
      last_activity_at: now,
      updated_at: now,
    };

    if (repair.setStatusJoined && lead.status !== "joined" && lead.joined_at) {
      update.status = "joined";
      if (repair.note) {
        update.notes = appendNote(lead.notes, repair.note);
      }
    }

    console.log(`${repair.fullName}: ${lead.status} -> ${update.status ?? lead.status}`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("leads")
        .update(update)
        .eq("id", repair.leadId);

      if (updateError) {
        throw new Error(`Failed to update ${repair.fullName}: ${updateError.message}`);
      }
    }
  }

  const emails = [
    "houghtonmatt22@gmail.com",
    "jwestgomila@gmail.com",
    "j.jeff23@pm.me",
  ];
  const { data: verified } = await supabase
    .from("leads")
    .select("full_name, email, status, last_activity_at")
    .eq("academy_id", KINGSTON_ACADEMY_ID)
    .in("email", emails)
    .order("last_activity_at", { ascending: false });

  console.log("\nVerification:");
  console.log(JSON.stringify(verified, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
