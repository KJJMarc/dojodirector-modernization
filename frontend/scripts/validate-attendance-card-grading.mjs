#!/usr/bin/env node
/**
 * Validate attendance card G markers for imported legacy grade history.
 *
 * Usage (from frontend/):
 *   node scripts/validate-attendance-card-grading.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(FRONTEND_DIR, ".env.local");
  const env = fs.readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
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

function filterGradeAwardsForYear(awards, year) {
  return awards
    .map((award) => {
      const dateKey = normalizeToDateKey(award.awarded_at);
      if (!dateKey || !dateKey.startsWith(`${year}-`)) return null;
      return { ...award, awarded_at: dateKey };
    })
    .filter(Boolean);
}

function collectGradingMarkerDates(gradeAwards) {
  const dates = new Set();
  for (const award of gradeAwards) {
    const dateKey = normalizeToDateKey(award.awarded_at);
    if (dateKey) dates.add(dateKey);
  }
  return [...dates].sort();
}

function buildYearlyGrid(attendances, gradeAwards, year) {
  const attendedDays = new Set();
  const gradingDays = new Set(collectGradingMarkerDates(gradeAwards));

  for (const record of attendances) {
    const attendedOn = normalizeToDateKey(record.attended_on);
    if (attendedOn) attendedDays.add(attendedOn);
  }

  const markerDates = [];
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (gradingDays.has(dateKey)) {
        markerDates.push(dateKey);
      }
    }
  }

  return markerDates.sort();
}

async function main() {
  loadEnv();

  const { createClient } = await import(
    pathToFileURL(
      path.join(FRONTEND_DIR, "node_modules/@supabase/supabase-js/dist/index.mjs"),
    ).href
  );

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const KJJ = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
  const MARC = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
  const RAY = "2d9be65b-c0ef-4553-9690-a3f274d31540";

  async function loadAwards(userId) {
    const { data, error } = await sb
      .from("grade_awards")
      .select("awarded_at, belt_levels(name, type)")
      .eq("user_id", userId)
      .eq("club_id", KJJ)
      .order("awarded_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async function loadAttendance(userId, year) {
    const { data, error } = await sb
      .from("attendance_records")
      .select("attended_on")
      .eq("user_id", userId)
      .eq("club_id", KJJ)
      .gte("attended_on", `${year}-01-01`)
      .lte("attended_on", `${year}-12-31`);
    if (error) throw error;
    return data ?? [];
  }

  let failed = false;

  console.log("Attendance card grading marker validation\n");

  const marcAwards = await loadAwards(MARC);
  console.log(`Marc: ${marcAwards.length} grade_awards loaded`);

  const marcBlackBeltChecks = [
    { year: 2016, date: "2016-12-04", label: "Black Belt" },
    { year: 2019, date: "2019-12-08", label: "Black Belt 1st Degree" },
    { year: 2022, date: "2022-12-03", label: "Black Belt 2nd Degree" },
    { year: 2025, date: "2025-12-06", label: "Black Belt 3rd Degree" },
  ];

  for (const check of marcBlackBeltChecks) {
    const yearAwards = filterGradeAwardsForYear(marcAwards, check.year);
    const markerDates = buildYearlyGrid(
      await loadAttendance(MARC, check.year),
      yearAwards,
      check.year,
    );
    const pass = markerDates.includes(check.date);
    console.log(
      `  [${pass ? "PASS" : "FAIL"}] Marc ${check.year} ${check.label}: G on ${check.date}`,
    );
    if (!pass) failed = true;
  }

  const marcYears = [
    ...new Set(
      marcAwards
        .map((award) => normalizeToDateKey(award.awarded_at)?.slice(0, 4))
        .filter(Boolean),
    ),
  ];

  for (const year of marcYears.sort()) {
    const yearNum = Number(year);
    const yearAwards = filterGradeAwardsForYear(marcAwards, yearNum);
    const markerDates = buildYearlyGrid(
      await loadAttendance(MARC, yearNum),
      yearAwards,
      yearNum,
    );
    const expected = collectGradingMarkerDates(yearAwards);
    const pass =
      markerDates.length === expected.length &&
      expected.every((date) => markerDates.includes(date));
    console.log(
      `  [${pass ? "PASS" : "FAIL"}] Marc ${year}: ${expected.length} G markers (${markerDates.join(", ")})`,
    );
    if (!pass) failed = true;
  }

  const rayAwards = await loadAwards(RAY);
  console.log(`\nRay: ${rayAwards.length} grade_awards loaded`);

  const rayYears = [
    ...new Set(
      rayAwards
        .map((award) => normalizeToDateKey(award.awarded_at)?.slice(0, 4))
        .filter(Boolean),
    ),
  ];

  for (const year of rayYears.sort()) {
    const yearNum = Number(year);
    const yearAwards = filterGradeAwardsForYear(rayAwards, yearNum);
    const markerDates = buildYearlyGrid(
      await loadAttendance(RAY, yearNum),
      yearAwards,
      yearNum,
    );
    const expected = collectGradingMarkerDates(yearAwards);
    const pass =
      markerDates.length === expected.length &&
      expected.every((date) => markerDates.includes(date));
    console.log(
      `  [${pass ? "PASS" : "FAIL"}] Ray ${year}: ${expected.length} G markers`,
    );
    if (!pass) failed = true;
  }

  console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
