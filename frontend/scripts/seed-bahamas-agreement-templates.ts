#!/usr/bin/env node
/**
 * Seed Bahamas Jiu Jitsu membership + guest training agreement templates.
 *
 * Replaces placeholder bodies in club_agreement_templates with the full
 * Bahamas-adapted agreement text.
 *
 * Usage:
 *   cd frontend && npx tsx scripts/seed-bahamas-agreement-templates.ts
 *   cd frontend && npx tsx scripts/seed-bahamas-agreement-templates.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAHAMAS_GUEST_TRAINING_AGREEMENT_SECTIONS,
  BAHAMAS_GUEST_TRAINING_AGREEMENT_TITLE,
  BAHAMAS_GUEST_TRAINING_AGREEMENT_VERSION,
  BAHAMAS_JIU_JITSU_CLUB_NAME,
  BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS,
  BAHAMAS_MEMBERSHIP_AGREEMENT_TITLE,
  BAHAMAS_MEMBERSHIP_AGREEMENT_VERSION,
} from "../src/lib/bahamas-jiu-jitsu-agreements.shared";
import {
  CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
  CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
  serializeAgreementSectionsToBody,
} from "../src/lib/club-agreement-templates.shared";
import { BAHAMAS_JIU_JITSU_CLUB_SLUG } from "../src/lib/clubs.shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes("--apply");
const BAHAMAS_CLUB_ID = "276cb805-7095-4e78-984b-bb41fb2cb664";

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

const TEMPLATES = [
  {
    agreementType: CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
    title: BAHAMAS_MEMBERSHIP_AGREEMENT_TITLE,
    version: BAHAMAS_MEMBERSHIP_AGREEMENT_VERSION,
    body: serializeAgreementSectionsToBody(BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS),
  },
  {
    agreementType: CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
    title: BAHAMAS_GUEST_TRAINING_AGREEMENT_TITLE,
    version: BAHAMAS_GUEST_TRAINING_AGREEMENT_VERSION,
    body: serializeAgreementSectionsToBody(BAHAMAS_GUEST_TRAINING_AGREEMENT_SECTIONS),
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("id", BAHAMAS_CLUB_ID)
    .maybeSingle();

  if (clubError || !club || club.slug !== BAHAMAS_JIU_JITSU_CLUB_SLUG) {
    throw new Error(
      `Bahamas club not found (${BAHAMAS_CLUB_ID}): ${clubError?.message ?? "missing"}`,
    );
  }

  console.log(`Club: ${club.name} (${club.slug})`);
  console.log(apply ? "Mode: APPLY" : "Mode: dry-run (pass --apply to write)");

  for (const template of TEMPLATES) {
    const { data: activeRows, error: activeError } = await supabase
      .from("club_agreement_templates")
      .select("id, title, version, body, is_active, updated_at")
      .eq("club_id", BAHAMAS_CLUB_ID)
      .eq("agreement_type", template.agreementType)
      .eq("is_active", true);

    if (activeError) {
      throw new Error(
        `Unable to load ${template.agreementType}: ${activeError.message}`,
      );
    }

    const current = activeRows?.[0] ?? null;
    const currentPreview = (current?.body ?? "").slice(0, 80).replace(/\s+/g, " ");
    console.log(`\n${template.agreementType}`);
    console.log(`  target: ${template.title} v${template.version} (${template.body.length} chars)`);
    console.log(
      `  current: ${
        current
          ? `${current.title} v${current.version} — "${currentPreview}…"`
          : "(none)"
      }`,
    );

    if (!apply) continue;

    const now = new Date().toISOString();
    if (activeRows && activeRows.length > 0) {
      const { error: deactivateError } = await supabase
        .from("club_agreement_templates")
        .update({ is_active: false, updated_at: now })
        .eq("club_id", BAHAMAS_CLUB_ID)
        .eq("agreement_type", template.agreementType)
        .eq("is_active", true);

      if (deactivateError) {
        throw new Error(
          `Unable to deactivate ${template.agreementType}: ${deactivateError.message}`,
        );
      }
    }

    const { error: insertError } = await supabase
      .from("club_agreement_templates")
      .insert({
        club_id: BAHAMAS_CLUB_ID,
        agreement_type: template.agreementType,
        title: template.title,
        version: template.version,
        body: template.body,
        is_active: true,
        updated_at: now,
      });

    if (insertError) {
      throw new Error(
        `Unable to insert ${template.agreementType}: ${insertError.message}`,
      );
    }

    console.log("  saved.");
  }

  if (!apply) {
    console.log("\nDry-run complete. Re-run with --apply to update live templates.");
  } else {
    console.log(`\nDone. ${BAHAMAS_JIU_JITSU_CLUB_NAME} agreements are live.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
