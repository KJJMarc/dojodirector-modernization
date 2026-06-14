/**
 * Relabels today's Kingston Jiu Jitsu Kids web lead as Google Ads.
 * Run: node scripts/relabel-kingston-kids-google-ads-lead.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  const contents = readFileSync(path, "utf8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(__dirname, "..", ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function run() {
  const { data: kidsClub, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", "kingston-jiu-jitsu-kids")
    .maybeSingle();

  if (clubError) {
    throw new Error(clubError.message);
  }

  if (!kidsClub) {
    throw new Error("Kingston Jiu Jitsu Kids club not found.");
  }

  const { data: beforeRows, error: beforeError } = await supabase
    .from("leads")
    .select("id, full_name, email, lead_source, created_at")
    .eq("academy_id", kidsClub.id)
    .gte("created_at", "2026-06-14T00:00:00.000Z")
    .order("created_at", { ascending: false });

  if (beforeError) {
    throw new Error(beforeError.message);
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("leads")
    .update({ lead_source: "google_ads" })
    .eq("academy_id", kidsClub.id)
    .in("lead_source", ["website", "website_direct"])
    .gte("created_at", "2026-06-14T00:00:00.000Z")
    .select("id, full_name, email, lead_source, created_at");

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { data: afterRows, error: afterError } = await supabase
    .from("leads")
    .select("id, full_name, email, lead_source, created_at")
    .eq("academy_id", kidsClub.id)
    .gte("created_at", "2026-06-14T00:00:00.000Z")
    .order("created_at", { ascending: false });

  if (afterError) {
    throw new Error(afterError.message);
  }

  console.log(
    JSON.stringify(
      {
        club: kidsClub,
        before: beforeRows ?? [],
        updated: updatedRows ?? [],
        after: afterRows ?? [],
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
