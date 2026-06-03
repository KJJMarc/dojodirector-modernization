/**
 * Verify academy admin login redirect rules.
 *
 * Usage: node scripts/verify-academy-admin-login-flow.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MARC_USER_ID = "3a0714f2-9a27-493d-bfbf-899bf9ef04f9";
const PRIMARY_SUPER_ADMIN_USER_ID = "e7c3a912-5d4b-4f81-9c2e-0a8b6d1f3e45";
const KJJ_SLUG = "kingston-jiu-jitsu";
const KJJ_KIDS_SLUG = "kingston-jiu-jitsu-kids";
const CLUB_ADMIN_ROLES = new Set(["admin", "owner"]);
const SUPER_ADMIN_ROLE = "super_admin";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isActiveStatus(status) {
  const normalized = status?.trim().toLowerCase();
  return !normalized || normalized === "active" || normalized === "trial";
}

function resolveAccessibleAcademyAdminMemberships(rows) {
  const byClubId = new Map();

  for (const row of rows) {
    if (!isActiveStatus(row.status)) continue;
    if (!CLUB_ADMIN_ROLES.has(row.role) && row.role !== SUPER_ADMIN_ROLE) continue;

    const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    if (!clubs?.slug) continue;

    const membership = {
      clubId: row.club_id,
      clubSlug: clubs.slug,
      clubName: clubs.name,
      role: row.role,
      status: row.status,
    };

    const existing = byClubId.get(row.club_id);
    if (!existing) {
      byClubId.set(row.club_id, membership);
      continue;
    }

    if (CLUB_ADMIN_ROLES.has(row.role) && existing.role === SUPER_ADMIN_ROLE) {
      byClubId.set(row.club_id, membership);
    }
  }

  return Array.from(byClubId.values()).sort((left, right) =>
    left.clubName.localeCompare(right.clubName),
  );
}

function resolveAcademyAdminLoginDestination(academies) {
  if (academies.length === 0) return null;
  if (academies.length === 1) return `/admin/${academies[0].clubSlug}`;
  return "/admin/select";
}

async function loadAdminMembershipRows(userId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(slug, name)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function main() {
  console.log("=== Academy admin login flow verification ===\n");

  const marcRows = await loadAdminMembershipRows(MARC_USER_ID);
  const marcAcademies = resolveAccessibleAcademyAdminMemberships(marcRows);
  const marcDestination = resolveAcademyAdminLoginDestination(marcAcademies);

  assert(marcAcademies.length === 1, `Marc should have one academy admin membership, got ${marcAcademies.length}.`);
  assert(
    marcAcademies[0].clubSlug === KJJ_SLUG,
    `Marc academy should be ${KJJ_SLUG}, got ${marcAcademies[0].clubSlug}.`,
  );
  assert(
    marcAcademies[0].role === "admin",
    `Marc academy role should be admin, got ${marcAcademies[0].role}.`,
  );
  assert(
    marcDestination === `/admin/${KJJ_SLUG}`,
    `Marc login destination should be /admin/${KJJ_SLUG}, got ${marcDestination}.`,
  );
  console.log("Marc academy admin login → direct dashboard:", marcDestination);

  const primaryRows = await loadAdminMembershipRows(PRIMARY_SUPER_ADMIN_USER_ID);
  const primaryAcademies = resolveAccessibleAcademyAdminMemberships(primaryRows);
  const primaryDestination = resolveAcademyAdminLoginDestination(primaryAcademies);

  assert(primaryAcademies.length === 2, `Primary Super Admin should have 2 academies, got ${primaryAcademies.length}.`);
  assert(
    primaryDestination === "/admin/select",
    `Primary Super Admin academy login should go to /admin/select, got ${primaryDestination}.`,
  );
  console.log("Primary Super Admin academy login → selector:", primaryDestination);

  const { data: studentMembership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("role", "student")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (studentMembership?.user_id) {
    const studentRows = await loadAdminMembershipRows(studentMembership.user_id);
    const studentAcademies = resolveAccessibleAcademyAdminMemberships(studentRows);
    assert(
      studentAcademies.length === 0,
      "Pure student accounts must not resolve academy admin destinations.",
    );
    console.log("Pure student account → no academy admin access");
  }

  const primarySuperAdminOnly = primaryRows.every((row) => row.role === SUPER_ADMIN_ROLE);
  assert(primarySuperAdminOnly, "Primary account should use super_admin memberships for academy access.");

  console.log("\nRoute expectations:");
  console.log("- /admin/login → Admin Access heading");
  console.log("- /super-admin/login → Super Admin Access heading");
  console.log("- /admin-access/[clubSlug] → Admin Access heading (legacy)");
  console.log("\nAll checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
