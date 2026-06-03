/**
 * Verify Super Admin accounts and last-Super-Admin protection prerequisites.
 *
 * Usage: node scripts/verify-super-admin-capability.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, club_id, role, status, clubs(name, slug), users(first_name, last_name, email)")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const byUser = new Map();

  for (const row of data ?? []) {
    const users = Array.isArray(row.users) ? row.users[0] : row.users;
    const clubs = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    const existing = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      name: users
        ? `${users.first_name ?? ""} ${users.last_name ?? ""}`.trim()
        : row.user_id,
      email: users?.email ?? null,
      clubs: [],
    };

    existing.clubs.push(clubs?.name ?? row.club_id);
    byUser.set(row.user_id, existing);
  }

  console.log(`Active Super Admin users: ${byUser.size}`);

  for (const entry of byUser.values()) {
    console.log(`- ${entry.name || entry.userId}`);
    console.log(`  user_id: ${entry.userId}`);
    console.log(`  email: ${entry.email ?? "(none)"}`);
    console.log(`  clubs: ${entry.clubs.join(", ")}`);
  }

  if (byUser.size <= 1) {
    console.warn(
      "\nWARNING: Only one Super Admin remains. Deletion/demotion protection should stay enabled.",
    );
  } else {
    console.log("\nMultiple Super Admin accounts present. Lockout protection can safely block last-account changes.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
