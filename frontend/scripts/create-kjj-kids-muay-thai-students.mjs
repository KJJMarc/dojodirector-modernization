#!/usr/bin/env node
/**
 * Create Muay Thai-only students in Kingston Jiu Jitsu Kids.
 *
 * Usage (from frontend/):
 *   node scripts/create-kjj-kids-muay-thai-students.mjs --dry-run
 *   node scripts/create-kjj-kids-muay-thai-students.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const MUAY_THAI_TYPE = "muay_thai";
const TODAY = new Date().toISOString().slice(0, 10);

const STUDENTS = [
  { firstName: "Holly", lastName: "Aviles", email: "territa.nebraska@hotmail.co.uk" },
  { firstName: "Lyric", lastName: "Evangelista", email: "claudiafrancesca@outlook.com" },
  { firstName: "Robert", lastName: "Dyu", email: null },
  { firstName: "Aous", lastName: "Karfakh", email: "doloqsif@yahoo.com" },
  { firstName: "Oliver", lastName: "Tyrrell", email: "kevintyrrell@hotmail.com" },
  { firstName: "Logan", lastName: "Dharwan", email: "adhawan247@gmail.com" },
  { firstName: "Amari", lastName: "Olivos", email: "mollyolivos3@hotmail.com" },
  { firstName: "Leah", lastName: "Gearing", email: "maryonas@hotmail.com" },
  { firstName: "Max", lastName: "Watson", email: "zoe.eckford@gmail.com" },
  { firstName: "Yulin", lastName: "Wang", email: "younglu1982@gmail.com" },
  { firstName: "Sophia", lastName: "Heath", email: "chipova76@hotmail.com" },
  { firstName: "Poppy", lastName: "Pritchard", email: "ppritchard21@greycourt.org.uk" },
  { firstName: "Adel", lastName: "Abdalla", email: "viorica_stoica2012@yahoo.com" },
  { firstName: "Issei", lastName: "Keith", email: "marikokeith@gmail.com" },
  { firstName: "Romeo", lastName: "Lovas", email: "ivanalovas1@yahoo.co.uk" },
  { firstName: "Savannah", lastName: "Lovas", email: null },
  { firstName: "Riley", lastName: "Sen", email: "sam.sen@live.com" },
  { firstName: "Kinan", lastName: "Ghanem", email: "lydia_gh1@hotmail.com" },
  { firstName: "Ryan", lastName: "Ghanem", email: null },
  { firstName: "Arkin", lastName: "Mercado", email: "iamkaori07@gmail.com" },
];

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

function normalizeEmail(email) {
  if (!email) {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

function formatName(student) {
  return `${student.firstName} ${student.lastName}`;
}

async function findUserByEmail(supabase, email) {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up ${email}: ${error.message}`);
  }

  return data;
}

async function findKidsMembership(supabase, clubId, userId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up membership: ${error.message}`);
  }

  return data;
}

async function syncMuayThaiOnlyAccess(supabase, clubId, userId, muayThaiProgrammeId) {
  const { data: clubProgrammes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", clubId)
    .in("programme_type", ["bjj", "muay_thai", "strength_conditioning"]);

  if (programmesError) {
    throw new Error(`Failed to load programmes: ${programmesError.message}`);
  }

  const programmeIdsByType = new Map(
    (clubProgrammes ?? []).map((row) => [row.programme_type, row.id]),
  );
  const accessProgrammeIds = Array.from(programmeIdsByType.values());

  const { error: membershipError } = await supabase.from("programme_memberships").upsert(
    {
      programme_id: muayThaiProgrammeId,
      user_id: userId,
      status: "active",
      joined_at: TODAY,
    },
    { onConflict: "programme_id,user_id" },
  );

  if (membershipError) {
    throw new Error(`Failed to set Muay Thai membership: ${membershipError.message}`);
  }

  const bjjProgrammeId = programmeIdsByType.get("bjj");
  const scProgrammeId = programmeIdsByType.get("strength_conditioning");

  if (bjjProgrammeId) {
    const { error } = await supabase
      .from("programme_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("programme_id", bjjProgrammeId);

    if (error) {
      throw new Error(`Failed to remove BJJ membership: ${error.message}`);
    }
  }

  if (scProgrammeId) {
    const { error } = await supabase
      .from("programme_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("programme_id", scProgrammeId);

    if (error) {
      throw new Error(`Failed to remove S&C membership: ${error.message}`);
    }
  }

  const { error: bookingUpsertError } = await supabase.from("programme_booking_access").upsert(
    {
      programme_id: muayThaiProgrammeId,
      user_id: userId,
    },
    { onConflict: "programme_id,user_id" },
  );

  if (bookingUpsertError) {
    throw new Error(`Failed to set Muay Thai booking access: ${bookingUpsertError.message}`);
  }

  const { error: bookingDeleteError } = await supabase
    .from("programme_booking_access")
    .delete()
    .eq("user_id", userId)
    .in("programme_id", accessProgrammeIds.filter((id) => id !== muayThaiProgrammeId));

  if (bookingDeleteError) {
    throw new Error(`Failed to remove other booking access: ${bookingDeleteError.message}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  loadEnv();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", KIDS_SLUG)
    .single();

  if (clubError || !club) {
    throw new Error(`Kids club not found: ${clubError?.message ?? "missing row"}`);
  }

  const { data: muayThaiProgramme, error: programmeError } = await supabase
    .from("programmes")
    .select("id, name")
    .eq("club_id", club.id)
    .eq("programme_type", MUAY_THAI_TYPE)
    .single();

  if (programmeError || !muayThaiProgramme) {
    throw new Error(`Muay Thai programme not found: ${programmeError?.message ?? "missing row"}`);
  }

  const results = [];

  for (const student of STUDENTS) {
    const email = normalizeEmail(student.email);
    const label = formatName(student);

    if (dryRun) {
      results.push({ label, email, action: "would_create" });
      continue;
    }

    let userId = null;
    let createdUser = false;

    if (email) {
      const existingUser = await findUserByEmail(supabase, email);

      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      const { data: createdUserRow, error: createUserError } = await supabase
        .from("users")
        .insert({
          first_name: student.firstName,
          last_name: student.lastName,
          email,
        })
        .select("id")
        .single();

      if (createUserError) {
        throw new Error(`Failed to create ${label}: ${createUserError.message}`);
      }

      userId = createdUserRow.id;
      createdUser = true;
    }

    const existingMembership = await findKidsMembership(supabase, club.id, userId);

    if (!existingMembership) {
      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: userId,
        club_id: club.id,
        role: "student",
        status: "active",
        joined_at: TODAY,
      });

      if (membershipError) {
        throw new Error(`Failed to create club membership for ${label}: ${membershipError.message}`);
      }
    }

    await syncMuayThaiOnlyAccess(supabase, club.id, userId, muayThaiProgramme.id);

    results.push({
      label,
      email,
      userId,
      createdUser,
      kidsMembership: existingMembership ? "existing" : "created",
    });
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Processed ${STUDENTS.length} students for ${club.name}`,
  );

  for (const row of results) {
    console.log(row);
  }

  if (!dryRun) {
    const userIds = results.map((row) => row.userId).filter(Boolean);
    const { data: memberships } = await supabase
      .from("programme_memberships")
      .select("user_id, programme_id, programmes(programme_type, name)")
      .in("user_id", userIds);
    const { data: bookingAccess } = await supabase
      .from("programme_booking_access")
      .select("user_id, programme_id, programmes(programme_type, name)")
      .in("user_id", userIds);

    console.log("\nVerification:");
    console.log("programme_memberships", memberships);
    console.log("programme_booking_access", bookingAccess);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
