#!/usr/bin/env node
/**
 * Report duplicate student profile emails (case-insensitive, trimmed).
 *
 * Usage (from frontend/):
 *   node scripts/report-duplicate-student-emails.mjs
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

function normalizeEmail(email) {
  const trimmed = String(email ?? "").trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

async function main() {
  loadEnv();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: users, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email");

  if (error) {
    throw new Error(`Failed to load users: ${error.message}`);
  }

  const byEmail = new Map();

  for (const user of users ?? []) {
    const normalized = normalizeEmail(user.email);
    if (!normalized) {
      continue;
    }

    const entry = byEmail.get(normalized) ?? [];
    entry.push(user);
    byEmail.set(normalized, entry);
  }

  const duplicates = [...byEmail.entries()].filter(([, rows]) => rows.length > 1);

  if (duplicates.length === 0) {
    console.log("No duplicate student profile emails found.");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate email group(s):\n`);

  for (const [email, rows] of duplicates.sort(([a], [b]) => a.localeCompare(b))) {
    console.log(email);
    for (const row of rows) {
      console.log(
        `  - ${row.id}: ${[row.first_name, row.last_name].filter(Boolean).join(" ") || "(no name)"} (${row.email})`,
      );
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
