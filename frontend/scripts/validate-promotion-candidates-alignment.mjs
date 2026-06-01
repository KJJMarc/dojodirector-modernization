#!/usr/bin/env node
/**
 * Validate promotion star count matches Promotion Candidates list.
 *
 * Usage (from frontend/):
 *   node scripts/validate-promotion-candidates-alignment.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const CLARE_ID = "b3092955-e688-43c0-bb0c-adbfae7e7b62";
const MARC_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const RAY_ID = "2d9be65b-c0ef-4553-9690-a3f274d31540";

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

function normalizeToDateKey(value) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

async function importShared(modulePath) {
  return import(pathToFileURL(path.join(FRONTEND_DIR, modulePath)).href);
}

async function main() {
  loadEnv();

  const { createClient } = await import(
    pathToFileURL(
      path.join(FRONTEND_DIR, "node_modules/@supabase/supabase-js/dist/index.mjs"),
    ).href,
  );

  const {
    buildStudentBeltPromotionAssessment,
    isStudentEligibleForPromotion,
    pickLatestGradeAwardByUserId,
  } = await importShared("src/lib/admin-belt-promotion.shared.ts");

  const {
    buildBjjAttendanceSummary,
    isBjjAttendanceRecordWithJoinedSession,
    ATTENDANCE_RECORDS_BJJ_BULK_SELECT,
  } = await importShared("src/lib/admin-bjj-attendance.shared.ts");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: memberships, error: membershipsError } = await sb
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", KJJ_CLUB_ID);

  if (membershipsError) throw membershipsError;

  const allUserIds = [...new Set((memberships ?? []).map((row) => row.user_id))];
  const studentOnlyUserIds = [
    ...new Set(
      (memberships ?? [])
        .filter((row) => row.status === "active" && row.role === "student")
        .map((row) => row.user_id),
    ),
  ];

  const clareMembership = (memberships ?? []).find((row) => row.user_id === CLARE_ID);

  const [{ data: beltLevels }, { data: gradingRequirements }, { data: users }] =
    await Promise.all([
      sb
        .from("belt_levels")
        .select("id, name, stripe_count, sort_order, type, belt_category")
        .eq("club_id", KJJ_CLUB_ID)
        .order("sort_order", { ascending: true }),
      sb.from("grading_requirements").select("*"),
      sb.from("users").select("id, first_name, last_name, email").in("id", allUserIds),
    ]);

  const requirementsByTargetBeltId = new Map(
    (gradingRequirements ?? []).map((row) => [row.belt_level_id, row]),
  );

  const { data: allAwards } = await sb
    .from("grade_awards")
    .select("user_id, belt_level_id, awarded_at")
    .eq("club_id", KJJ_CLUB_ID)
    .in("user_id", allUserIds);

  const latestAwardByUserId = pickLatestGradeAwardByUserId(allAwards ?? []);

  async function loadAllAttendanceRows(client, clubId, userIds) {
    const all = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client
        .from("attendance_records")
        .select(ATTENDANCE_RECORDS_BJJ_BULK_SELECT)
        .eq("club_id", clubId)
        .in("user_id", userIds)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const page = data ?? [];
      all.push(...page);
      if (page.length < pageSize) break;
    }
    return { data: all };
  }

  const { data: attendanceRows } = await loadAllAttendanceRows(
    sb,
    KJJ_CLUB_ID,
    allUserIds,
  );

  const bjjRecordsByUserId = new Map();
  for (const row of attendanceRows ?? []) {
    if (!isBjjAttendanceRecordWithJoinedSession(row)) continue;
    const list = bjjRecordsByUserId.get(row.user_id) ?? [];
    list.push({ attended_on: row.attended_on });
    bjjRecordsByUserId.set(row.user_id, list);
  }

  function assessUser(userId) {
    const latestAward = latestAwardByUserId.get(userId);
    const awardedAt = normalizeToDateKey(latestAward?.awarded_at ?? null);
    const bjjRecords = bjjRecordsByUserId.get(userId) ?? [];
    const bjjAttendance = buildBjjAttendanceSummary(bjjRecords, awardedAt);
    return buildStudentBeltPromotionAssessment({
      userId,
      latestAward,
      beltLevels: beltLevels ?? [],
      requirementsByTargetBeltId,
      juniorRequirementsByFromBeltId: new Map(),
      bjjAttendance,
    });
  }

  const starred = [];
  const candidates = [];

  for (const userId of allUserIds) {
    const assessment = assessUser(userId);
    if (isStudentEligibleForPromotion(assessment)) {
      starred.push(userId);
      candidates.push(userId);
    }
  }

  const starredSet = new Set(starred);
  const candidateSet = new Set(candidates);
  const missing = starred.filter((id) => !candidateSet.has(id));
  const clareAssessment = assessUser(CLARE_ID);

  console.log("Promotion alignment validation (shared assessment logic)");
  console.log(`  club memberships: ${allUserIds.length}`);
  console.log(`  old student-only scope: ${studentOnlyUserIds.length}`);
  console.log(`  Clare in all memberships: ${allUserIds.includes(CLARE_ID)}`);
  console.log(`  Clare in old student-only scope: ${studentOnlyUserIds.includes(CLARE_ID)}`);
  console.log(`  Clare membership role: ${clareMembership?.role ?? "(none)"}`);
  console.log(`  students with red star: ${starred.length}`);
  console.log(`  promotion candidates: ${candidates.length}`);
  console.log(`  misaligned: ${missing.length}`);

  console.log("");
  console.log("Clare Barton");
  console.log(`  eligible: ${isStudentEligibleForPromotion(clareAssessment)}`);
  console.log(`  current belt: ${clareAssessment?.currentBeltLabel ?? "(none)"}`);
  console.log(`  next belt: ${clareAssessment?.nextBeltLabel ?? "(none)"}`);
  console.log(
    `  attendance since award: ${clareAssessment?.attendanceSinceAward ?? "?"}/${clareAssessment?.requiredAttendance ?? "?"}`,
  );
  console.log(
    `  time since award: ${clareAssessment?.timeSinceAward ?? "?"} ${clareAssessment?.timeUnit ?? ""} (required ${clareAssessment?.requiredTime ?? "?"})`,
  );
  console.log(`  in candidates list: ${candidateSet.has(CLARE_ID)}`);

  const marcEligible = isStudentEligibleForPromotion(assessUser(MARC_ID));
  const rayEligible = isStudentEligibleForPromotion(assessUser(RAY_ID));

  console.log("");
  console.log("Marc / Ray");
  console.log(`  Marc eligible=${marcEligible} inCandidates=${candidateSet.has(MARC_ID)}`);
  console.log(`  Ray eligible=${rayEligible} inCandidates=${candidateSet.has(RAY_ID)}`);

  const pass =
    missing.length === 0 &&
    starred.length === candidates.length &&
    allUserIds.includes(CLARE_ID) &&
    !studentOnlyUserIds.includes(CLARE_ID) &&
    isStudentEligibleForPromotion(clareAssessment) &&
    candidateSet.has(CLARE_ID);

  console.log("");
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
