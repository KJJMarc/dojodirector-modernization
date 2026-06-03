#!/usr/bin/env node
/**
 * Convert memberships.status and programme_memberships.status from suspended to paused.
 *
 * Usage (from frontend/):
 *   node scripts/migrate-membership-status-suspended-to-paused.mjs --dry-run
 *   node scripts/migrate-membership-status-suspended-to-paused.mjs
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

async function countSuspended(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status", "suspended");

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const membershipCount = await countSuspended(supabase, "memberships");
  const programmeMembershipCount = await countSuspended(
    supabase,
    "programme_memberships",
  );

  console.log(
    dryRun ? "DRY RUN — no changes will be applied\n" : "APPLYING MIGRATION\n",
  );
  console.log(`memberships suspended -> paused: ${membershipCount}`);
  console.log(
    `programme_memberships suspended -> paused: ${programmeMembershipCount}`,
  );

  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  if (membershipCount > 0) {
    const { error } = await supabase
      .from("memberships")
      .update({ status: "paused" })
      .eq("status", "suspended");

    if (error) {
      throw new Error(error.message);
    }
  }

  if (programmeMembershipCount > 0) {
    const { error } = await supabase
      .from("programme_memberships")
      .update({ status: "paused" })
      .eq("status", "suspended");

    if (error) {
      throw new Error(error.message);
    }
  }

  console.log("\nMigration complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
