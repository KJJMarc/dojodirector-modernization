/**
 * Create or repair an independent backup Super Admin account.
 *
 * Required env (frontend/.env.local or shell):
 *   BACKUP_SUPER_ADMIN_EMAIL
 *   BACKUP_SUPER_ADMIN_PASSWORD   (min 8 characters)
 *
 * Optional env:
 *   BACKUP_SUPER_ADMIN_FIRST_NAME (default: Backup)
 *   BACKUP_SUPER_ADMIN_LAST_NAME  (default: Super Admin)
 *
 * Usage:
 *   node scripts/create-backup-super-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const KJJ_CLUB_SLUG = "kingston-jiu-jitsu";
const KJJ_KIDS_CLUB_SLUG = "kingston-jiu-jitsu-kids";
const BACKUP_SUPER_ADMIN_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

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
const email = process.env.BACKUP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BACKUP_SUPER_ADMIN_PASSWORD ?? "";
const firstName = process.env.BACKUP_SUPER_ADMIN_FIRST_NAME?.trim() || "Backup";
const lastName = process.env.BACKUP_SUPER_ADMIN_LAST_NAME?.trim() || "Super Admin";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!email) {
  console.error("Set BACKUP_SUPER_ADMIN_EMAIL before running this script.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Set BACKUP_SUPER_ADMIN_PASSWORD (minimum 8 characters).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function countActiveSuperAdminUsers() {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count Super Admin users: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.user_id)).size;
}

async function findAuthUserIdByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const match = (data.users ?? []).find(
      (user) => user.email?.trim().toLowerCase() === targetEmail,
    );

    if (match?.id) {
      return match.id;
    }

    if ((data.users ?? []).length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function resolveClubId(slug) {
  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club ${slug}: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`Club not found: ${slug}`);
  }

  return data;
}

async function ensureSuperAdminMembership(userId, club) {
  const { data: existing, error: loadError } = await supabase
    .from("memberships")
    .select("id, role, status")
    .eq("user_id", userId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load membership for ${club.slug}: ${loadError.message}`);
  }

  if (existing) {
    const updates = {};
    if (existing.role !== "super_admin") updates.role = "super_admin";
    if (existing.status !== "active") updates.status = "active";

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("memberships")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) {
        throw new Error(`Failed to update membership for ${club.slug}: ${error.message}`);
      }

      console.log(`Updated membership at ${club.name}:`, updates);
    } else {
      console.log(`Membership already super_admin/active at ${club.name}.`);
    }

    return;
  }

  const { error } = await supabase.from("memberships").insert({
    user_id: userId,
    club_id: club.id,
    role: "super_admin",
    status: "active",
    joined_at: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    throw new Error(`Failed to create membership for ${club.slug}: ${error.message}`);
  }

  console.log(`Created super_admin membership at ${club.name}.`);
}

async function main() {
  const beforeCount = await countActiveSuperAdminUsers();
  console.log(`Active Super Admin users before: ${beforeCount}`);

  let authUserId = await findAuthUserIdByEmail(email);

  if (!authUserId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Failed to create auth user: ${error.message}`);
    }

    authUserId = data.user?.id ?? null;

    if (!authUserId) {
      throw new Error("Auth user creation did not return an id.");
    }

    console.log("Created Supabase auth user:", authUserId);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Failed to update auth user password: ${error.message}`);
    }

    console.log("Reused existing Supabase auth user:", authUserId);
  }

  const { data: existingProfile, error: profileLoadError } = await supabase
    .from("users")
    .select("id, email, auth_user_id")
    .eq("id", BACKUP_SUPER_ADMIN_USER_ID)
    .maybeSingle();

  if (profileLoadError) {
    throw new Error(`Failed to load backup profile: ${profileLoadError.message}`);
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("users").insert({
      id: BACKUP_SUPER_ADMIN_USER_ID,
      first_name: firstName,
      last_name: lastName,
      email,
      auth_user_id: authUserId,
      portal_login_email: email,
      portal_auth_status: "active",
      instructor_portal_login_email: email,
      instructor_portal_auth_status: "active",
    });

    if (insertError) {
      throw new Error(`Failed to create backup user profile: ${insertError.message}`);
    }

    console.log("Created backup user profile:", BACKUP_SUPER_ADMIN_USER_ID);
  } else {
    const { error: updateError } = await supabase
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        auth_user_id: authUserId,
        portal_login_email: email,
        portal_auth_status: "active",
        instructor_portal_login_email: email,
        instructor_portal_auth_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", BACKUP_SUPER_ADMIN_USER_ID);

    if (updateError) {
      throw new Error(`Failed to update backup user profile: ${updateError.message}`);
    }

    console.log("Updated backup user profile:", BACKUP_SUPER_ADMIN_USER_ID);
  }

  const kjjClub = await resolveClubId(KJJ_CLUB_SLUG);
  const kidsClub = await resolveClubId(KJJ_KIDS_CLUB_SLUG);

  await ensureSuperAdminMembership(BACKUP_SUPER_ADMIN_USER_ID, kjjClub);
  await ensureSuperAdminMembership(BACKUP_SUPER_ADMIN_USER_ID, kidsClub);

  const afterCount = await countActiveSuperAdminUsers();
  console.log(`Active Super Admin users after: ${afterCount}`);
  console.log("\nBackup Super Admin ready:");
  console.log(`  Profile id: ${BACKUP_SUPER_ADMIN_USER_ID}`);
  console.log(`  Email: ${email}`);
  console.log(`  Auth user id: ${authUserId}`);
  console.log(`  Clubs: ${kjjClub.name}, ${kidsClub.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
