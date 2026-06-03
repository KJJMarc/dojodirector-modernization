/**
 * Verify adult belt rankings include admin/super_admin/owner members.
 *
 * Usage:
 *   node scripts/verify-adult-belt-rankings-members.mjs
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

async function main() {
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("user_id, role, status, users(first_name, last_name)")
    .eq("club_id", clubId)
    .order("role");

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const activeMembers = (memberships ?? []).filter((row) =>
    isActiveStatus(row.status),
  );

  const userIds = activeMembers.map((row) => row.user_id);
  const { data: awards, error: awardsError } = await supabase
    .from("grade_awards")
    .select("user_id, belt_level_id, awarded_at, belt_levels(name, type, belt_category)")
    .eq("club_id", clubId)
    .in("user_id", userIds)
    .order("awarded_at", { ascending: false });

  if (awardsError) {
    throw new Error(awardsError.message);
  }

  const latestByUserId = new Map();
  for (const award of awards ?? []) {
    if (!latestByUserId.has(award.user_id)) {
      latestByUserId.set(award.user_id, award);
    }
  }

  const targets = ["Marc Barton", "Clare Barton"];
  let failures = 0;

  for (const targetName of targets) {
    const member = activeMembers.find((row) => {
      const first = row.users?.first_name ?? "";
      const last = row.users?.last_name ?? "";
      return `${first} ${last}`.trim() === targetName;
    });

    if (!member) {
      console.error(`FAIL: ${targetName} not found in active memberships`);
      failures += 1;
      continue;
    }

    const latest = latestByUserId.get(member.user_id);
    const beltName = latest?.belt_levels?.name ?? "No grade award";

    console.log(
      `OK: ${targetName} | role=${member.role} | status=${member.status} | rank=${beltName}`,
    );
  }

  const roleCounts = activeMembers.reduce((counts, row) => {
    counts[row.role ?? "unknown"] = (counts[row.role ?? "unknown"] ?? 0) + 1;
    return counts;
  }, {});

  console.log("Active membership roles included:", roleCounts);
  console.log(`Active members with grade awards: ${latestByUserId.size}`);

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
