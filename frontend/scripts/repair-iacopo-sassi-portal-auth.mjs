/**
 * One-user repair: activate portal flags for iacoposassi@outlook.com
 * Does not change auth_user_id, memberships, bookings, attendance, or assignments.
 *
 * Usage: node scripts/repair-iacopo-sassi-portal-auth.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_EMAIL = "iacoposassi@outlook.com";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing frontend/.env.local");
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

async function main() {
  const { data: before, error: beforeError } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, auth_user_id, portal_auth_status, instructor_portal_auth_status",
    )
    .ilike("email", TARGET_EMAIL)
    .maybeSingle();

  if (beforeError) throw new Error(beforeError.message);
  if (!before) throw new Error(`User not found for ${TARGET_EMAIL}`);

  console.log("Before:", before);

  const updates = {};
  if (before.portal_auth_status !== "active") {
    updates.portal_auth_status = "active";
  }
  if (before.instructor_portal_auth_status !== "active") {
    updates.instructor_portal_auth_status = "active";
  }

  if (Object.keys(updates).length === 0) {
    console.log("No changes needed — portal flags already active.");
    return;
  }

  updates.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", before.id);

  if (updateError) throw new Error(updateError.message);

  const { data: after, error: afterError } = await supabase
    .from("users")
    .select(
      "id, email, auth_user_id, portal_auth_status, instructor_portal_auth_status",
    )
    .eq("id", before.id)
    .single();

  if (afterError) throw new Error(afterError.message);

  console.log("Updated:", updates);
  console.log("After:", after);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
