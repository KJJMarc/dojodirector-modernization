#!/usr/bin/env node
/**
 * Verify Europe/London recurring session migrations are applied in Supabase.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-london-recurring-migrations.mjs
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LONDON_TIMEZONE = "Europe/London";

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    if (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    guess += (targetMinutes - actualMinutes) * 60 * 1000;
  }

  return new Date(guess).toISOString();
}

async function rpcLondonWallClock(day, time) {
  // PostgREST matches by argument name; both must match the SQL function signature.
  const { data, error } = await supabase.rpc("london_wall_clock_to_timestamptz", {
    p_day: day,
    p_clock: time.length === 5 ? `${time}:00` : time,
  });

  if (error) {
    throw new Error(`RPC london_wall_clock_to_timestamptz failed: ${error.message}`);
  }

  return new Date(data).toISOString();
}

async function main() {
  const checks = [];

  try {
    const winter = await rpcLondonWallClock("2026-01-07", "19:00");
    const winterExpected = londonLocalDateTimeToUtcIso("2026-01-07", "19:00");
    checks.push({
      name: "Winter Wednesday 19:00 (GMT)",
      ok: winter === winterExpected,
      detail: `${winter} expected ${winterExpected}`,
    });
  } catch (error) {
    checks.push({
      name: "london_wall_clock_to_timestamptz RPC",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const summer = await rpcLondonWallClock("2026-07-01", "19:00");
    const summerExpected = londonLocalDateTimeToUtcIso("2026-07-01", "19:00");
    checks.push({
      name: "Summer Wednesday 19:00 (BST)",
      ok: summer === summerExpected,
      detail: `${summer} expected ${summerExpected}`,
    });
  } catch (error) {
    checks.push({
      name: "Summer Wednesday 19:00 (BST)",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { error } = await supabase.rpc("generate_recurring_class_sessions", {
      p_schedule_id: "00000000-0000-0000-0000-000000000000",
      p_days_ahead: 1,
    });

    const present = Boolean(
      error && error.message.includes("Recurring class schedule not found"),
    );
    checks.push({
      name: "generate_recurring_class_sessions RPC",
      ok: present,
      detail: present ? "callable" : (error?.message ?? "missing"),
    });
  } catch (error) {
    checks.push({
      name: "generate_recurring_class_sessions RPC",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  let failed = 0;
  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} — ${check.name}: ${check.detail}`);
    if (!check.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(
      "\nApply migrations:\n" +
        "  supabase/migrations/20260602150000_fix_london_recurring_session_generation.sql\n" +
        "  supabase/migrations/20260602170000_recurring_session_generation_one_year.sql",
    );
    process.exit(1);
  }

  console.log("\nAll London recurring migration checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
