#!/usr/bin/env node
/**
 * Ellis Lawrence — Kingston Jiu Jitsu Kids orphan legacy restore.
 *
 * Ellis (legacy_user_id 5536) has club_users, grades, and attendance in the
 * legacy export but no users row in kjj_profiles.csv — skipped by the full import.
 *
 * Profile fields are taken from prowd_production_v4.sql (May 2025 snapshot).
 * Email is null: parent Justin Lawrence (5487) holds justinlawrence@live.co.uk.
 *
 * Usage (from frontend/):
 *   node scripts/restore-ellis-lawrence-kids.mjs --dry-run
 *   node scripts/restore-ellis-lawrence-kids.mjs
 *
 * Requires legacy Kids CSV export in legacy-export/kjj-kids/output/ (local only).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(FRONTEND_DIR, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "legacy-export/kjj-kids/output");
const ENV_PATH = path.join(FRONTEND_DIR, ".env.local");

const { createClient } = await import(
  pathToFileURL(
    path.join(FRONTEND_DIR, "node_modules/@supabase/supabase-js/dist/index.mjs"),
  ).href,
);

const KIDS_CLUB_ID = "0e81995e-7ed5-490d-8425-f23c87f34587";
const KIDS_CLUB_SLUG = "kingston-jiu-jitsu-kids";
const IMPORT_NOTES = "legacy_import:kjj_kids_ellis_restore";
const ATTENDANCE_SOURCE = "legacy_import";

const LEGACY_USER_ID = 5536;
const PILOT_FIRST_NAME = "ellis";
const PILOT_LAST_NAME = "lawrence";

/** No kjj_profiles.csv row — reconstructed from legacy SQL dump. */
const ORPHAN_PROFILE = {
  legacy_user_id: String(LEGACY_USER_ID),
  first_name: "Ellis",
  last_name: "Lawrence",
  email: "justinlawrence@live.co.uk",
  phone_number: "",
  date_of_birth: "",
  notes: "",
  is_deleted: "f",
  gender_cd: "1",
  address_line_1: "",
  address_line_2: "",
  address_city: "",
  address_postcode: "",
};

const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cells[index] ?? "";
    });
    return obj;
  });
}

function readCsv(name) {
  const filePath = path.join(OUTPUT_DIR, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function parseDate(value) {
  if (!value?.trim()) return null;
  return value.trim().split(" ")[0] || null;
}

function formatAddress(row) {
  const parts = [
    row.address_line_1,
    row.address_line_2,
    row.address_city,
    row.address_postcode,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function truthy(value) {
  const v = (value ?? "").toString().trim().toLowerCase();
  return v === "t" || v === "true" || v === "1" || v === "yes";
}

function normalizeLegacyLevelName(raw) {
  let name = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (!name) return name;
  name = name.replace(/,\s*(\d+(?:st|nd|rd|th)\s+Degree)/gi, " $1");
  name = name.replace(/,\s*(\d+)\s+Stripe(s?)/i, (_, n) => {
    const count = Number(n);
    return count === 1 ? " 1 Stripe" : ` ${count} Stripes`;
  });
  name = name.replace(/\b(\d+)\s+Stripe\b(?!s)/i, (_, n) => {
    const count = Number(n);
    return count === 1 ? "1 Stripe" : `${count} Stripes`;
  });
  name = name.replace(/\s*&\s*/g, " ");
  return name.replace(/\s+/g, " ").trim();
}

function mapLegacyGender(genderCd) {
  const raw = (genderCd ?? "").toString().trim();
  if (raw === "0") return "female";
  if (raw === "1") return "male";
  return null;
}

function assertOnlySubjectRows(label, rows) {
  for (const row of rows) {
    const rowUserId = Number(row.legacy_user_id);
    if (rowUserId !== LEGACY_USER_ID) {
      throw new Error(
        `${label} contains legacy_user_id ${rowUserId} — expected only ${LEGACY_USER_ID}.`,
      );
    }
  }
}

function assertJuniorLegacyLevelName(levelName) {
  const raw = (levelName ?? "").trim();
  const normalized = normalizeLegacyLevelName(raw);
  if (!/^junior\b/i.test(normalized)) {
    throw new Error(
      `Refusing non-junior legacy level "${raw}" (normalized: "${normalized}").`,
    );
  }
  return normalized;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function columnExists(supabase, table, column) {
  const { error } = await supabase.from(table).select(column).limit(0);
  if (!error) return true;
  const message = (error.message ?? "").toLowerCase();
  return !(
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

async function fetchCount(supabase, table, filters) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [method, args] of filters) {
    query = query[method](...args);
  }
  const { count, error } = await query;
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function loadUserScopedCounts(supabase, userId) {
  if (!userId || String(userId).startsWith("(dry-run")) {
    return {
      users: 0,
      kids_memberships: 0,
      programme_memberships_bjj: 0,
      grade_awards: 0,
      attendance_records: 0,
      attendance_legacy_import: 0,
    };
  }

  const { data: bjjProgramme, error: programmeError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", KIDS_CLUB_ID)
    .eq("programme_type", "bjj")
    .maybeSingle();
  if (programmeError) throw new Error(programmeError.message);

  const bjjProgrammeId = bjjProgramme?.id ?? null;

  const [
    kidsMemberships,
    gradeAwards,
    attendanceRecords,
    attendanceLegacy,
    programmeMemberships,
  ] = await Promise.all([
    fetchCount(supabase, "memberships", [
      ["eq", ["user_id", userId]],
      ["eq", ["club_id", KIDS_CLUB_ID]],
    ]),
    fetchCount(supabase, "grade_awards", [
      ["eq", ["user_id", userId]],
      ["eq", ["club_id", KIDS_CLUB_ID]],
    ]),
    fetchCount(supabase, "attendance_records", [
      ["eq", ["user_id", userId]],
      ["eq", ["club_id", KIDS_CLUB_ID]],
    ]),
    fetchCount(supabase, "attendance_records", [
      ["eq", ["user_id", userId]],
      ["eq", ["club_id", KIDS_CLUB_ID]],
      ["eq", ["source", ATTENDANCE_SOURCE]],
    ]),
    bjjProgrammeId
      ? fetchCount(supabase, "programme_memberships", [
          ["eq", ["user_id", userId]],
          ["eq", ["programme_id", bjjProgrammeId]],
        ])
      : Promise.resolve(0),
  ]);

  return {
    users: 1,
    kids_memberships: kidsMemberships,
    programme_memberships_bjj: programmeMemberships,
    grade_awards: gradeAwards,
    attendance_records: attendanceRecords,
    attendance_legacy_import: attendanceLegacy,
  };
}

async function loadJuniorBeltMap(supabase) {
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name")
    .eq("club_id", KIDS_CLUB_ID)
    .eq("belt_category", "junior");

  if (error) throw new Error(`Junior belt_levels load: ${error.message}`);
  if (!data?.length) {
    throw new Error(`No junior belt_levels found for club ${KIDS_CLUB_ID}`);
  }

  const byName = new Map(data.map((belt) => [belt.name, belt.id]));
  return { byName, count: data.length };
}

function resolveJuniorBeltLevelId(levelName, beltByName, failedMappings) {
  const normalized = assertJuniorLegacyLevelName(levelName);
  const beltLevelId = beltByName.get(normalized);
  if (!beltLevelId) {
    failedMappings.push({
      legacy_level_name: levelName,
      normalized_name: normalized,
    });
    return null;
  }
  return beltLevelId;
}

async function resolveEllisUser(supabase) {
  const { data: byLegacy, error: legacyError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, legacy_user_id, role, auth_user_id")
    .eq("legacy_user_id", LEGACY_USER_ID)
    .maybeSingle();
  if (legacyError) throw new Error(legacyError.message);
  if (byLegacy) {
    const first = (byLegacy.first_name ?? "").trim().toLowerCase();
    const last = (byLegacy.last_name ?? "").trim().toLowerCase();
    if (first !== PILOT_FIRST_NAME || last !== PILOT_LAST_NAME) {
      throw new Error(
        `legacy_user_id ${LEGACY_USER_ID} maps to ${byLegacy.first_name} ${byLegacy.last_name}, not Ellis Lawrence.`,
      );
    }
    return { type: "existing", user: byLegacy, match: "legacy_user_id" };
  }

  const { data: byName, error: nameError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, legacy_user_id")
    .ilike("first_name", "Ellis")
    .ilike("last_name", "Lawrence");
  if (nameError) throw new Error(nameError.message);

  const matches = (byName ?? []).filter((row) => {
    const first = (row.first_name ?? "").trim().toLowerCase();
    const last = (row.last_name ?? "").trim().toLowerCase();
    return first === PILOT_FIRST_NAME && last === PILOT_LAST_NAME;
  });

  if (matches.length > 1) {
    throw new Error(
      `Multiple Ellis Lawrence users in Supabase (${matches.map((m) => m.id).join(", ")}) — resolve before import.`,
    );
  }
  if (matches.length === 1) {
    const row = matches[0];
    if (row.legacy_user_id && Number(row.legacy_user_id) !== LEGACY_USER_ID) {
      throw new Error(
        `Ellis Lawrence user ${row.id} has legacy_user_id ${row.legacy_user_id}, expected ${LEGACY_USER_ID}.`,
      );
    }
    return { type: "existing", user: row, match: "name" };
  }

  return { type: "new", match: "legacy_user_id" };
}

function buildUserPayload(profile, columns) {
  return {
    legacy_user_id: LEGACY_USER_ID,
    first_name: profile.first_name?.trim() || "Ellis",
    last_name: profile.last_name?.trim() || "Lawrence",
    email: null,
    phone: profile.phone_number?.trim() || null,
    date_of_birth: parseDate(profile.date_of_birth),
    notes: profile.notes?.trim() || null,
    is_active: !truthy(profile.is_deleted),
    role: "student",
    auth_user_id: null,
    ...(columns.address ? { address: formatAddress(profile) } : {}),
    ...(columns.gender ? { gender: mapLegacyGender(profile.gender_cd) } : {}),
  };
}

function buildMembershipPayload(membership, userId) {
  return {
    user_id: userId,
    club_id: KIDS_CLUB_ID,
    role: "student",
    status: truthy(membership.suspended) ? "paused" : "active",
    legacy_club_user_id: Number(membership.legacy_club_user_id),
    joined_at: parseDate(membership.created_at),
  };
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const profile = ORPHAN_PROFILE;

  const membershipsAll = readCsv("kjj_memberships.csv");
  const membershipRows = membershipsAll.filter(
    (row) => Number(row.legacy_user_id) === LEGACY_USER_ID,
  );
  if (membershipRows.length !== 1) {
    throw new Error(
      `Expected exactly one Kids membership for Ellis (legacy_user_id=${LEGACY_USER_ID}), found ${membershipRows.length}.`,
    );
  }

  const userLevels = readCsv("kjj_user_levels.csv").filter(
    (row) => Number(row.legacy_user_id) === LEGACY_USER_ID,
  );
  const attendances = readCsv("kjj_attendances.csv").filter(
    (row) => Number(row.legacy_user_id) === LEGACY_USER_ID,
  );
  const eventAttendances = readCsv("kjj_event_attendances.csv").filter(
    (row) => Number(row.legacy_user_id) === LEGACY_USER_ID,
  );

  assertOnlySubjectRows("kjj_user_levels.csv", userLevels);
  assertOnlySubjectRows("kjj_attendances.csv", attendances);
  assertOnlySubjectRows("kjj_event_attendances.csv", eventAttendances);

  const stats = {
    user: { inserted: 0, updated: 0, skipped: 0 },
    membership: { inserted: 0, updated: 0, skipped: 0 },
    programmeMembership: { inserted: 0, updated: 0, skipped: 0 },
    gradeAwards: { inserted: 0, updated: 0, skipped: 0, failed: 0 },
    attendanceDayMarks: { inserted: 0, skipped: 0, failed: 0 },
    attendanceEvents: { inserted: 0, skipped: 0, failed: 0 },
    warnings: [],
    failedBeltMappings: [],
  };

  const userResolution = await resolveEllisUser(supabase);
  const existingUserId = userResolution.type === "existing" ? userResolution.user.id : null;

  const beforeCounts = await loadUserScopedCounts(supabase, existingUserId);

  const hasAddressColumn = await columnExists(supabase, "users", "address");
  const hasGenderColumn = await columnExists(supabase, "users", "gender");
  const hasEventAttendeeColumn = await columnExists(
    supabase,
    "attendance_records",
    "legacy_event_attendee_id",
  );

  const { byName: juniorBeltByName, count: juniorBeltCount } =
    await loadJuniorBeltMap(supabase);

  const { data: bjjProgramme, error: bjjProgrammeError } = await supabase
    .from("programmes")
    .select("id, name, programme_type")
    .eq("club_id", KIDS_CLUB_ID)
    .eq("programme_type", "bjj")
    .maybeSingle();
  if (bjjProgrammeError) throw new Error(bjjProgrammeError.message);
  if (!bjjProgramme?.id) {
    throw new Error(`Kids BJJ programme not found for club ${KIDS_CLUB_ID}`);
  }

  const existingGradeKeys = new Set();
  if (existingUserId) {
    const { data: grades, error: gradesError } = await supabase
      .from("grade_awards")
      .select("legacy_user_level_id")
      .eq("user_id", existingUserId)
      .eq("club_id", KIDS_CLUB_ID);
    if (gradesError) throw new Error(gradesError.message);
    for (const row of grades ?? []) {
      if (row.legacy_user_level_id != null) {
        existingGradeKeys.add(Number(row.legacy_user_level_id));
      }
    }
  }

  const existingAttendanceKeys = new Set();
  if (existingUserId) {
    const selectCols = hasEventAttendeeColumn
      ? "legacy_attendance_id, legacy_event_attendee_id"
      : "legacy_attendance_id";
    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance_records")
      .select(selectCols)
      .eq("user_id", existingUserId)
      .eq("club_id", KIDS_CLUB_ID);
    if (attendanceError) throw new Error(attendanceError.message);
    for (const row of attendanceRows ?? []) {
      if (row.legacy_attendance_id != null) {
        existingAttendanceKeys.add(`a:${row.legacy_attendance_id}`);
      }
      if (hasEventAttendeeColumn && row.legacy_event_attendee_id != null) {
        existingAttendanceKeys.add(`e:${row.legacy_event_attendee_id}`);
      }
    }
  }

  const userPayload = buildUserPayload(profile, {
    address: hasAddressColumn,
    gender: hasGenderColumn,
  });

  console.log("Ellis Lawrence — KJJ Kids orphan legacy restore");
  console.log(`  club: ${KIDS_CLUB_SLUG} (${KIDS_CLUB_ID})`);
  console.log(`  legacy_user_id: ${LEGACY_USER_ID}`);
  console.log(`  legacy_email (export): ${profile.email?.trim() || "(none)"}`);
  console.log(`  import_email: (null) — parent Justin holds justinlawrence@live.co.uk`);
  console.log(`  user_match: ${userResolution.match ?? userResolution.type}`);
  console.log(`  junior belt_levels available: ${juniorBeltCount}`);
  console.log(`  bjj programme_id: ${bjjProgramme.id}`);
  console.log(DRY_RUN ? "\nDRY RUN — no writes\n" : "\nLIVE IMPORT\n");
  console.log("Export (Ellis only):", {
    user_levels: userLevels.length,
    day_marks: attendances.length,
    event_attendances: eventAttendances.length,
    combined_attendance: attendances.length + eventAttendances.length,
  });

  console.log("\nBefore counts (Supabase, this user @ Kids club):");
  console.log(JSON.stringify(beforeCounts, null, 2));

  let ellisUserId = existingUserId ?? (DRY_RUN ? "(dry-run-new-user)" : null);

  if (userResolution.type === "existing") {
    ellisUserId = userResolution.user.id;
    if (!DRY_RUN) {
      const updatePayload = { ...userPayload };
      delete updatePayload.auth_user_id;
      updatePayload.email = null;
      if (userResolution.user.auth_user_id) {
        delete updatePayload.role;
      }
      if (!userResolution.user.legacy_user_id) {
        updatePayload.legacy_user_id = LEGACY_USER_ID;
      }
      const { error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", ellisUserId);
      if (error) throw new Error(`User update: ${error.message}`);
      stats.user.updated = 1;
    } else {
      stats.user.updated = 1;
    }
  } else if (!DRY_RUN) {
    const { data, error } = await supabase
      .from("users")
      .insert(userPayload)
      .select("id")
      .single();
    if (error) throw new Error(`User insert: ${error.message}`);
    ellisUserId = data.id;
    stats.user.inserted = 1;
  } else {
    stats.user.inserted = 1;
  }

  const membershipPayload = buildMembershipPayload(membershipRows[0], ellisUserId);

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("id, legacy_club_user_id")
    .eq("user_id", ellisUserId)
    .eq("club_id", KIDS_CLUB_ID)
    .maybeSingle();

  if (existingMembership?.id) {
    if (!DRY_RUN) {
      const { error } = await supabase
        .from("memberships")
        .update({
          status: membershipPayload.status,
          legacy_club_user_id: membershipPayload.legacy_club_user_id,
          joined_at: membershipPayload.joined_at,
        })
        .eq("id", existingMembership.id);
      if (error) throw new Error(`Membership update: ${error.message}`);
      stats.membership.updated = 1;
    } else {
      stats.membership.updated = 1;
    }
  } else if (!DRY_RUN) {
    const { error } = await supabase.from("memberships").insert(membershipPayload);
    if (error) throw new Error(`Membership insert: ${error.message}`);
    stats.membership.inserted = 1;
  } else {
    stats.membership.inserted = 1;
  }

  const { data: existingProgrammeMembership } = await supabase
    .from("programme_memberships")
    .select("id, status")
    .eq("programme_id", bjjProgramme.id)
    .eq("user_id", ellisUserId)
    .maybeSingle();

  if (existingProgrammeMembership?.id) {
    if (!DRY_RUN) {
      const { error } = await supabase
        .from("programme_memberships")
        .upsert(
          {
            programme_id: bjjProgramme.id,
            user_id: ellisUserId,
            status: "active",
          },
          { onConflict: "programme_id,user_id" },
        );
      if (error) throw new Error(`programme_memberships upsert: ${error.message}`);
      stats.programmeMembership.updated = 1;
    } else {
      stats.programmeMembership.updated = 1;
    }
  } else if (!DRY_RUN) {
    const { error } = await supabase.from("programme_memberships").insert({
      programme_id: bjjProgramme.id,
      user_id: ellisUserId,
      status: "active",
      joined_at: parseDate(membershipRows[0].created_at) ?? new Date().toISOString().slice(0, 10),
    });
    if (error) throw new Error(`programme_memberships insert: ${error.message}`);
    stats.programmeMembership.inserted = 1;
  } else {
    stats.programmeMembership.inserted = 1;
  }

  const beltPreview = [];
  for (const row of userLevels) {
    const legacyUserLevelId = Number(row.user_level_id);
    const beltLevelId = resolveJuniorBeltLevelId(
      row.level_name,
      juniorBeltByName,
      stats.failedBeltMappings,
    );
    if (!beltLevelId) {
      stats.gradeAwards.failed += 1;
      continue;
    }

    beltPreview.push({
      legacy_user_level_id: legacyUserLevelId,
      legacy_level_name: row.level_name,
      normalized_name: normalizeLegacyLevelName(row.level_name),
      supabase_belt_level_id: beltLevelId,
      awarded_at: parseDate(row.awarded_at),
    });

    if (existingGradeKeys.has(legacyUserLevelId)) {
      stats.gradeAwards.skipped += 1;
      continue;
    }

    if (!DRY_RUN && ellisUserId && !String(ellisUserId).startsWith("(dry-run")) {
      const { error } = await supabase.from("grade_awards").insert({
        user_id: ellisUserId,
        club_id: KIDS_CLUB_ID,
        belt_level_id: beltLevelId,
        awarded_at: parseDate(row.awarded_at),
        legacy_user_level_id: legacyUserLevelId,
        notes: IMPORT_NOTES,
      });
      if (error) {
        stats.gradeAwards.failed += 1;
        stats.warnings.push(`grade_award ${legacyUserLevelId}: ${error.message}`);
        continue;
      }
      existingGradeKeys.add(legacyUserLevelId);
    }
    stats.gradeAwards.inserted += 1;
  }

  const dayMarkPayloads = [];
  for (const row of attendances) {
    const legacyAttendanceId = Number(row.attendance_id);
    const attendedOn = parseDate(row.date);
    if (!attendedOn) {
      stats.attendanceDayMarks.failed += 1;
      continue;
    }
    const key = `a:${legacyAttendanceId}`;
    if (existingAttendanceKeys.has(key)) {
      stats.attendanceDayMarks.skipped += 1;
      continue;
    }
    dayMarkPayloads.push({
      user_id: ellisUserId,
      club_id: KIDS_CLUB_ID,
      attended_on: attendedOn,
      class_session_id: null,
      source: ATTENDANCE_SOURCE,
      legacy_attendance_id: legacyAttendanceId,
    });
    existingAttendanceKeys.add(key);
    stats.attendanceDayMarks.inserted += 1;
  }

  if (!DRY_RUN && dayMarkPayloads.length > 0 && ellisUserId && !String(ellisUserId).startsWith("(dry-run")) {
    for (const batch of chunkArray(dayMarkPayloads, 100)) {
      const { error } = await supabase.from("attendance_records").insert(batch);
      if (error) {
        stats.attendanceDayMarks.failed += batch.length;
        stats.attendanceDayMarks.inserted -= batch.length;
        stats.warnings.push(`attendance batch: ${error.message}`);
      }
    }
  }

  for (const row of eventAttendances) {
    const legacyEventAttendeeId = Number(row.event_attendee_id);
    const attendedOn = parseDate(row.event_date || row.event_scheduled_at);
    if (!attendedOn) {
      stats.attendanceEvents.failed += 1;
      continue;
    }
    const key = hasEventAttendeeColumn
      ? `e:${legacyEventAttendeeId}`
      : `a:${-legacyEventAttendeeId}`;
    if (existingAttendanceKeys.has(key)) {
      stats.attendanceEvents.skipped += 1;
      continue;
    }

    if (!DRY_RUN && ellisUserId && !String(ellisUserId).startsWith("(dry-run")) {
      const insertPayload = {
        user_id: ellisUserId,
        club_id: KIDS_CLUB_ID,
        attended_on: attendedOn,
        class_session_id: null,
        source: ATTENDANCE_SOURCE,
      };
      if (hasEventAttendeeColumn) {
        insertPayload.legacy_event_attendee_id = legacyEventAttendeeId;
      } else {
        insertPayload.legacy_attendance_id = -legacyEventAttendeeId;
      }
      const { error } = await supabase.from("attendance_records").insert(insertPayload);
      if (error) {
        stats.attendanceEvents.failed += 1;
        stats.warnings.push(`event_attendee ${legacyEventAttendeeId}: ${error.message}`);
        continue;
      }
    }
    existingAttendanceKeys.add(key);
    stats.attendanceEvents.inserted += 1;
  }

  const afterCounts = DRY_RUN
    ? {
        projected_from_export: {
          grade_awards: stats.gradeAwards.inserted,
          attendance_records:
            stats.attendanceDayMarks.inserted + stats.attendanceEvents.inserted,
          programme_memberships_bjj: stats.programmeMembership.inserted
            ? 1
            : beforeCounts.programme_memberships_bjj,
          kids_memberships:
            beforeCounts.kids_memberships + (stats.membership.inserted ? 1 : 0),
        },
        note: "Dry-run — after_counts are projected, not queried from DB",
      }
    : await loadUserScopedCounts(supabase, ellisUserId);

  const sortedBelts = [...beltPreview].sort((a, b) =>
    (a.awarded_at ?? "").localeCompare(b.awarded_at ?? ""),
  );
  const latestBelt = sortedBelts.at(-1);

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    pilot: "Ellis Lawrence orphan restore",
    source_database: "prowd_production_v1",
    supabase_club_id: KIDS_CLUB_ID,
    supabase_club_slug: KIDS_CLUB_SLUG,
    legacy_user_id: LEGACY_USER_ID,
    legacy_email: profile.email ?? null,
    import_email: null,
    supabase_user_id: ellisUserId,
    user_match: userResolution.match ?? userResolution.type,
    import_notes: IMPORT_NOTES,
    attendance_source: ATTENDANCE_SOURCE,
    bjj_programme_id: bjjProgramme.id,
    user_resolution: userResolution.type,
    source_counts: {
      user_levels: userLevels.length,
      day_marks: attendances.length,
      event_attendances: eventAttendances.length,
      combined_attendance: attendances.length + eventAttendances.length,
    },
    before_counts: beforeCounts,
    after_counts: afterCounts,
    projected_current_belt: latestBelt
      ? {
          normalized_name: latestBelt.normalized_name,
          awarded_at: latestBelt.awarded_at,
        }
      : null,
    stats,
    belt_preview: beltPreview,
    failed_belt_mappings: stats.failedBeltMappings,
    safeguards: {
      portal_auth_created: false,
      outbound_email_sent: false,
      auth_user_id_on_new_users: null,
    },
  };

  const reportPath = path.join(
    FRONTEND_DIR,
    DRY_RUN ? "restore-ellis-lawrence-kids-dry-run-report.json" : "restore-ellis-lawrence-kids-report.json",
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("\nAfter counts:");
  console.log(JSON.stringify(afterCounts, null, 2));
  console.log("\nStats:", JSON.stringify(stats, null, 2));
  console.log(`\nLatest belt: ${latestBelt?.normalized_name ?? "(none)"} @ ${latestBelt?.awarded_at ?? ""}`);
  console.log(`\nReport: ${reportPath}`);

  if (stats.failedBeltMappings.length || stats.gradeAwards.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
