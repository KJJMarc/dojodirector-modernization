#!/usr/bin/env node
/**
 * Verify retention eligibility matches active student membership rules.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-retention-active-students-only.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const PAGE_SIZE = 1000;

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

function normalizeMembershipStatus(status) {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  return normalized === "suspended" ? "paused" : normalized;
}

function isActiveMembershipStatus(status) {
  return normalizeMembershipStatus(status) === "active";
}

function isActiveStudentClubMembership(membership) {
  return membership.role === "student" && isActiveMembershipStatus(membership.status);
}

function isExcludedStudentStatus(status) {
  const normalized = normalizeMembershipStatus(status);
  return (
    normalized === "paused" ||
    normalized === "inactive" ||
    normalized === "archived" ||
    normalized === "expired"
  );
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

const memberships = [];
let from = 0;

while (true) {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", KJJ_CLUB_ID)
    .order("user_id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load memberships:", error.message);
    process.exit(1);
  }

  const page = data ?? [];
  memberships.push(...page);

  if (page.length < PAGE_SIZE) {
    break;
  }

  from += PAGE_SIZE;
}

const studentMemberships = memberships.filter((row) => row.role === "student");
const activeStudents = studentMemberships.filter(isActiveStudentClubMembership);
const pausedStudents = studentMemberships.filter((row) =>
  ["paused", "suspended"].includes(normalizeMembershipStatus(row.status) ?? ""),
);
const inactiveStudents = studentMemberships.filter((row) =>
  ["inactive", "archived", "expired"].includes(normalizeMembershipStatus(row.status) ?? ""),
);
const excludedStudents = studentMemberships.filter(
  (row) => !isActiveStudentClubMembership(row),
);

console.log("Kingston Jiu Jitsu retention eligibility check");
console.log(`Student memberships: ${studentMemberships.length}`);
console.log(`Active students (retention eligible): ${activeStudents.length}`);
console.log(`Paused/suspended students: ${pausedStudents.length}`);
console.log(`Inactive/archived students: ${inactiveStudents.length}`);
console.log(`Excluded non-active students: ${excludedStudents.length}`);

const overlap = excludedStudents.filter((row) => isActiveStudentClubMembership(row));
if (overlap.length > 0) {
  console.error("Unexpected overlap in exclusion logic.");
  process.exit(1);
}

for (const row of pausedStudents) {
  if (isActiveStudentClubMembership(row)) {
    console.error("Paused student incorrectly marked active:", row.user_id, row.status);
    process.exit(1);
  }
}

for (const row of inactiveStudents) {
  if (isActiveStudentClubMembership(row)) {
    console.error("Inactive student incorrectly marked active:", row.user_id, row.status);
    process.exit(1);
  }
}

if (activeStudents.length === 0 && studentMemberships.length > 0) {
  console.warn("Warning: no active students found.");
}

const sampleActive = activeStudents.slice(0, 3).map((row) => row.user_id);
const samplePaused = pausedStudents.slice(0, 3).map((row) => row.user_id);
const sampleInactive = inactiveStudents.slice(0, 3).map((row) => row.user_id);

console.log("Sample active student ids:", sampleActive.join(", ") || "(none)");
console.log("Sample paused student ids:", samplePaused.join(", ") || "(none)");
console.log("Sample inactive student ids:", sampleInactive.join(", ") || "(none)");
console.log("Retention query should include only active students.");
console.log("OK");
