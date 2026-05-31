/**
 * Align Billy Bloggs test auth + profile emails to billy@billyblogs.com.
 *
 * Usage (from frontend/):
 *   node scripts/repair-billy-bloggs-auth-email.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_EMAIL = "billy@billyblogs.com";
const WRONG_EMAIL = "billy@billybloggs.com";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");

    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function isBillyBloggs(user) {
  const first = user.first_name?.trim().toLowerCase() ?? "";
  const last = user.last_name?.trim().toLowerCase() ?? "";
  return first === "billy" && last === "bloggs";
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    users.push(...(data.users ?? []));

    if ((data.users ?? []).length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Repairing Billy Bloggs portal auth emails...\n");

const { data: profileRows, error: profileError } = await supabase
  .from("users")
  .select(
    "id, first_name, last_name, email, portal_login_email, auth_user_id, portal_auth_status, portal_invited_at",
  )
  .ilike("first_name", "billy")
  .ilike("last_name", "bloggs");

if (profileError) {
  throw new Error(`Failed to load Billy Bloggs profile: ${profileError.message}`);
}

const billy = (profileRows ?? []).find(isBillyBloggs);

if (!billy) {
  console.error("No public.users row found for Billy Bloggs.");
  process.exit(1);
}

console.log("Before (public.users):");
console.log(JSON.stringify(billy, null, 2));

const authUsers = await listAllAuthUsers(supabase);
const targetAuth = authUsers.find(
  (user) => user.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
);
const wrongAuth = authUsers.find(
  (user) => user.email?.toLowerCase() === WRONG_EMAIL.toLowerCase(),
);

let linkedAuthId = billy.auth_user_id ?? null;

if (targetAuth) {
  linkedAuthId = targetAuth.id;
  console.log(`\nFound auth user for ${TARGET_EMAIL}: ${targetAuth.id}`);
} else if (wrongAuth) {
  const { data: updatedAuth, error: updateAuthError } =
    await supabase.auth.admin.updateUserById(wrongAuth.id, {
      email: TARGET_EMAIL,
    });

  if (updateAuthError) {
    throw new Error(
      `Failed to update auth email ${WRONG_EMAIL} → ${TARGET_EMAIL}: ${updateAuthError.message}`,
    );
  }

  linkedAuthId = updatedAuth.user.id;
  console.log(
    `\nUpdated auth.users email ${WRONG_EMAIL} → ${TARGET_EMAIL} (${linkedAuthId})`,
  );
} else if (linkedAuthId) {
  const linked = authUsers.find((user) => user.id === linkedAuthId);

  if (linked) {
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      linkedAuthId,
      { email: TARGET_EMAIL },
    );

    if (updateAuthError) {
      throw new Error(
        `Failed to update linked auth user email: ${updateAuthError.message}`,
      );
    }

    console.log(`\nUpdated linked auth user ${linkedAuthId} email → ${TARGET_EMAIL}`);
  } else {
    console.warn(
      `\nWarning: auth_user_id ${linkedAuthId} on profile not found in auth.users list.`,
    );
  }
} else {
  console.warn(
    `\nNo auth.users row for ${TARGET_EMAIL} or ${WRONG_EMAIL}. Invite Billy from admin when ready.`,
  );
}

const profileUpdate = {
  email: TARGET_EMAIL,
  portal_login_email: TARGET_EMAIL,
  ...(linkedAuthId
    ? {
        auth_user_id: linkedAuthId,
        portal_auth_status: "active",
      }
    : {}),
};

const { data: updatedProfile, error: profileUpdateError } = await supabase
  .from("users")
  .update(profileUpdate)
  .eq("id", billy.id)
  .select(
    "id, first_name, last_name, email, portal_login_email, auth_user_id, portal_auth_status",
  )
  .single();

if (profileUpdateError) {
  throw new Error(`Failed to update public.users: ${profileUpdateError.message}`);
}

console.log("\nAfter (public.users):");
console.log(JSON.stringify(updatedProfile, null, 2));

if (linkedAuthId) {
  const { data: verifyRow, error: verifyError } = await supabase
    .from("users")
    .select("id, email, portal_login_email, auth_user_id")
    .eq("auth_user_id", linkedAuthId)
    .maybeSingle();

  if (verifyError) {
    throw new Error(`Verification query failed: ${verifyError.message}`);
  }

  if (!verifyRow || verifyRow.id !== billy.id) {
    throw new Error(
      `auth_user_id linkage verification failed for ${linkedAuthId}.`,
    );
  }

  const authMatch = authUsers.find((user) => user.id === linkedAuthId) ??
    (await listAllAuthUsers(supabase)).find((user) => user.id === linkedAuthId);

  console.log("\nVerification:");
  console.log(
    JSON.stringify(
      {
        profileUserId: verifyRow.id,
        profileEmail: verifyRow.email,
        portalLoginEmail: verifyRow.portal_login_email,
        authUserId: verifyRow.auth_user_id,
        authEmail: authMatch?.email ?? TARGET_EMAIL,
        emailsMatch:
          verifyRow.email?.toLowerCase() === TARGET_EMAIL &&
          verifyRow.portal_login_email?.toLowerCase() === TARGET_EMAIL,
        linkageOk: verifyRow.auth_user_id === linkedAuthId,
      },
      null,
      2,
    ),
  );
  console.log("\nDone. Billy Bloggs auth email alignment succeeded.");
} else {
  console.log(
    "\nDone. public.users emails updated; link auth_user_id after creating/inviting auth user.",
  );
}
