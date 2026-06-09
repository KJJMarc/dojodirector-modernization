#!/usr/bin/env node
/**
 * Apply cancelled-slot duplicate fix to hosted Supabase.
 *
 * 1. Removes scheduled duplicates when a cancelled session already occupies the slot.
 * 2. Verifies generate_recurring_class_sessions does not recreate cancelled slots.
 *
 * Apply the SQL migration separately (Supabase SQL Editor or supabase db push):
 *   supabase/migrations/20260609140000_cancelled_recurring_slots_block_regeneration.sql
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/apply-cancelled-slot-fix.mjs --dry-run
 *   node frontend/scripts/apply-cancelled-slot-fix.mjs
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

const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadScheduledDuplicatesOverCancelled() {
  const { data: cancelled, error } = await supabase
    .from("class_sessions")
    .select("id, club_id, class_id, starts_at, recurring_schedule_id, classes(name)")
    .eq("status", "cancelled")
    .not("recurring_schedule_id", "is", null)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);

  const duplicates = [];

  for (const cancelledSession of cancelled ?? []) {
    const { data: scheduled, error: scheduledError } = await supabase
      .from("class_sessions")
      .select("id, status, source, created_at")
      .eq("club_id", cancelledSession.club_id)
      .eq("class_id", cancelledSession.class_id)
      .eq("starts_at", cancelledSession.starts_at)
      .neq("status", "cancelled");

    if (scheduledError) throw new Error(scheduledError.message);

    for (const row of scheduled ?? []) {
      duplicates.push({
        cancelled: cancelledSession,
        scheduled: row,
      });
    }
  }

  return duplicates;
}

async function removeScheduledDuplicates(duplicates) {
  for (const { cancelled, scheduled } of duplicates) {
    const className = Array.isArray(cancelled.classes)
      ? cancelled.classes[0]?.name
      : cancelled.classes?.name;

    console.log(
      `${dryRun ? "[dry-run] " : ""}Remove scheduled duplicate for ${className ?? "class"} ${cancelled.starts_at}`,
    );
    console.log(`  keep cancelled ${cancelled.id}`);
    console.log(`  remove scheduled ${scheduled.id} (${scheduled.source})`);

    if (!dryRun) {
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .eq("id", scheduled.id);

      if (error) throw new Error(error.message);
    }
  }
}

async function verifyCancelledSlotNotRegenerated() {
  const { data: cancelled, error } = await supabase
    .from("class_sessions")
    .select("id, recurring_schedule_id, starts_at, club_id, class_id")
    .eq("status", "cancelled")
    .not("recurring_schedule_id", "is", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!cancelled?.recurring_schedule_id) {
    console.log("Verification skipped: no future cancelled recurring session found.");
    return true;
  }

  const { count: beforeCount, error: beforeError } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", cancelled.club_id)
    .eq("class_id", cancelled.class_id)
    .eq("starts_at", cancelled.starts_at);

  if (beforeError) throw new Error(beforeError.message);

  const { data: inserted, error: rpcError } = await supabase.rpc(
    "generate_recurring_class_sessions",
    {
      p_schedule_id: cancelled.recurring_schedule_id,
      p_days_ahead: 364,
    },
  );

  if (rpcError) throw new Error(rpcError.message);

  const { count: afterCount, error: afterError } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", cancelled.club_id)
    .eq("class_id", cancelled.class_id)
    .eq("starts_at", cancelled.starts_at);

  if (afterError) throw new Error(afterError.message);

  const ok = (beforeCount ?? 0) === (afterCount ?? 1);
  console.log(
    `${ok ? "OK" : "FAIL"} — RPC regeneration check for cancelled slot ${cancelled.starts_at}: before=${beforeCount} after=${afterCount} rpc_inserted=${inserted ?? 0}`,
  );

  if (!ok) {
    console.error(
      "Apply migration: supabase/migrations/20260609140000_cancelled_recurring_slots_block_regeneration.sql",
    );
  }

  return ok;
}

async function main() {
  const duplicates = await loadScheduledDuplicatesOverCancelled();
  console.log(
    `${dryRun ? "Dry run" : "Applying"}: ${duplicates.length} scheduled duplicate(s) over cancelled slots`,
  );

  await removeScheduledDuplicates(duplicates);

  if (!dryRun) {
    const verified = await verifyCancelledSlotNotRegenerated();
    if (!verified) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
