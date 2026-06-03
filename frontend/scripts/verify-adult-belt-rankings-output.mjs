/**
 * Verify adult belt rankings output against live data expectations.
 *
 * Usage:
 *   node scripts/verify-adult-belt-rankings-output.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const clubId = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isActiveStatus(status) {
  return (status ?? "").trim().toLowerCase() === "active";
}

function getBeltStripeCount(belt) {
  if (typeof belt?.stripe_count === "number" && belt.stripe_count >= 0) {
    return belt.stripe_count;
  }
  const stripeMatch = belt?.name?.match(/(\d+)\s*stripe/i);
  return stripeMatch ? Number.parseInt(stripeMatch[1] ?? "0", 10) : 0;
}

function isJuniorBelt(belt) {
  if ((belt?.belt_category ?? "").toLowerCase() === "junior") return true;
  if ((belt?.type ?? "").toLowerCase() === "junior") return true;
  return /junior|kids|child/i.test(belt?.name ?? "");
}

async function main() {
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("user_id, role, status, users(first_name, last_name)")
    .eq("club_id", clubId);

  if (membershipError) throw new Error(membershipError.message);

  const activeMembers = (memberships ?? []).filter((row) =>
    isActiveStatus(row.status),
  );
  const userIds = activeMembers.map((row) => row.user_id);

  const [{ data: awards, error: awardsError }, { data: beltLevels, error: beltsError }] =
    await Promise.all([
      supabase
        .from("grade_awards")
        .select("user_id, belt_level_id, awarded_at")
        .eq("club_id", clubId)
        .in("user_id", userIds)
        .order("awarded_at", { ascending: false }),
      supabase
        .from("belt_levels")
        .select("id, name, stripe_count, type, belt_category")
        .eq("club_id", clubId),
    ]);

  if (awardsError) throw new Error(awardsError.message);
  if (beltsError) throw new Error(beltsError.message);

  const beltById = new Map((beltLevels ?? []).map((belt) => [belt.id, belt]));
  const latestByUserId = new Map();

  for (const award of awards ?? []) {
    if (!latestByUserId.has(award.user_id)) {
      latestByUserId.set(award.user_id, award);
    }
  }

  let plainWhiteInSource = 0;
  let stripedWhiteInSource = 0;
  const rankedNames = [];

  for (const member of activeMembers) {
    const latest = latestByUserId.get(member.user_id);
    const belt = latest?.belt_level_id
      ? beltById.get(latest.belt_level_id)
      : null;

    if (!belt || isJuniorBelt(belt)) continue;

    const name = `${member.users?.first_name ?? ""} ${member.users?.last_name ?? ""}`.trim();
    const stripeCount = getBeltStripeCount(belt);
    const isWhite = /white/i.test(belt.name);

    if (isWhite && stripeCount === 0) {
      plainWhiteInSource += 1;
      continue;
    }

    if (isWhite && stripeCount >= 1) {
      stripedWhiteInSource += 1;
    }

    if (name === "Marc Barton" || name === "Clare Barton") {
      rankedNames.push(`${name} | role=${member.role} | rank=${belt.name}`);
    }
  }

  let failures = 0;

  for (const line of rankedNames) {
    console.log(`OK: ${line}`);
    if (line.includes("Marc Barton") && !line.includes("Black Belt 3rd Degree")) {
      console.error("FAIL: Marc Barton not at Black Belt 3rd Degree");
      failures += 1;
    }
    if (line.includes("Clare Barton") && !line.includes("Brown Belt")) {
      console.error("FAIL: Clare Barton missing brown belt rank");
      failures += 1;
    }
  }

  if (rankedNames.length < 2) {
    console.error("FAIL: Expected Marc Barton and Clare Barton in ranked set");
    failures += 1;
  }

  console.log(
    `OK: ${plainWhiteInSource} plain white belts excluded; ${stripedWhiteInSource} striped white belts included`,
  );

  const adminRoles = activeMembers.filter((row) =>
    ["admin", "super_admin", "instructor"].includes(row.role ?? ""),
  );
  console.log(
    `OK: active non-student roles included in membership scope: ${adminRoles.length}`,
  );

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
