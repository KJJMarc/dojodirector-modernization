#!/usr/bin/env node
/**
 * Remove BJJ programme access for Muay Thai-only students misassigned by backfill.
 *
 * Usage (from frontend/):
 *   node scripts/repair-misassigned-programme-access.mjs [--dry-run]
 *   node scripts/repair-misassigned-programme-access.mjs --email user@example.com
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(FRONTEND_DIR, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2]
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const emailIndex = argv.indexOf("--email");
  const email =
    emailIndex >= 0 ? String(argv[emailIndex + 1] ?? "").trim().toLowerCase() : null;

  return { dryRun, email };
}

async function main() {
  loadEnv();
  const { dryRun, email } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type, club_id, name")
    .in("programme_type", ["bjj", "muay_thai"]);

  if (programmesError) {
    throw new Error(programmesError.message);
  }

  const bjjProgrammes = (programmes ?? []).filter((row) => row.programme_type === "bjj");
  const muayThaiProgrammes = (programmes ?? []).filter(
    (row) => row.programme_type === "muay_thai",
  );

  if (bjjProgrammes.length === 0 || muayThaiProgrammes.length === 0) {
    console.log("No BJJ or Muay Thai programmes found.");
    return;
  }

  let usersQuery = supabase
    .from("users")
    .select("id, email, first_name, last_name");

  if (email) {
    usersQuery = usersQuery.ilike("email", email);
  }

  const { data: users, error: usersError } = await usersQuery;
  if (usersError) {
    throw new Error(usersError.message);
  }

  const repairs = [];

  for (const user of users ?? []) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("programme_memberships")
      .select("programme_id, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipsError) {
      throw new Error(membershipsError.message);
    }

    const activeProgrammeIds = new Set(
      (memberships ?? []).map((row) => row.programme_id),
    );

    const hasMuayThai = muayThaiProgrammes.some((programme) =>
      activeProgrammeIds.has(programme.id),
    );
    const bjjProgrammeIds = bjjProgrammes
      .filter((programme) => activeProgrammeIds.has(programme.id))
      .map((programme) => programme.id);

    if (!hasMuayThai || bjjProgrammeIds.length === 0) {
      continue;
    }

    const { data: gradeAwards, error: gradeError } = await supabase
      .from("grade_awards")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (gradeError) {
      throw new Error(gradeError.message);
    }

    if ((gradeAwards ?? []).length > 0) {
      continue;
    }

    repairs.push({
      user,
      bjjProgrammeIds,
    });
  }

  if (repairs.length === 0) {
    console.log("No misassigned Muay Thai students needing BJJ removal.");
    return;
  }

  for (const repair of repairs) {
    const name = [repair.user.first_name, repair.user.last_name]
      .filter(Boolean)
      .join(" ");
    console.log(
      `${dryRun ? "[dry-run] " : ""}Repair ${name} <${repair.user.email}> — remove BJJ access`,
    );

    if (dryRun) {
      continue;
    }

    const { error: membershipDeleteError } = await supabase
      .from("programme_memberships")
      .delete()
      .eq("user_id", repair.user.id)
      .in("programme_id", repair.bjjProgrammeIds);

    if (membershipDeleteError) {
      throw new Error(membershipDeleteError.message);
    }

    const { error: bookingDeleteError } = await supabase
      .from("programme_booking_access")
      .delete()
      .eq("user_id", repair.user.id)
      .in("programme_id", repair.bjjProgrammeIds);

    if (bookingDeleteError && !bookingDeleteError.message.includes("programme_booking_access")) {
      throw new Error(bookingDeleteError.message);
    }
  }

  console.log(`Done. ${repairs.length} student(s) ${dryRun ? "would be" : ""} repaired.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
