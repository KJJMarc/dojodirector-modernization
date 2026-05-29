import { createClient } from "@supabase/supabase-js";

const MISSING_SERVICE_ROLE_KEY_MESSAGE =
  "Booking is not configured: SUPABASE_SERVICE_ROLE_KEY is missing. " +
  "Add it to .env.local (server-only, never NEXT_PUBLIC_). " +
  "Find it in Supabase Dashboard → Project Settings → API → service_role secret key.";

const INVALID_SERVICE_ROLE_KEY_MESSAGE =
  "Booking is not configured: SUPABASE_SERVICE_ROLE_KEY must be the service_role secret key, " +
  "not the anon/publishable key. Check Supabase Dashboard → Project Settings → API.";

function resolveServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(MISSING_SERVICE_ROLE_KEY_MESSAGE);
  }

  if (
    serviceRoleKey.startsWith("sb_publishable_") ||
    (anonKey && serviceRoleKey === anonKey)
  ) {
    throw new Error(INVALID_SERVICE_ROLE_KEY_MESSAGE);
  }

  return serviceRoleKey;
}

/**
 * Service-role client for trusted server-side writes only.
 * Never import this from client components or expose the key publicly.
 */
export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL is not set.");
  }

  const serviceRoleKey = resolveServiceRoleKey();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function describeServiceRoleKeyFormat(key: string | undefined) {
  if (!key) {
    return "none";
  }

  if (key.startsWith("eyJ")) {
    return "eyJ";
  }

  if (key.startsWith("sb_secret")) {
    return "sb_secret";
  }

  return "other";
}

function decodeServiceRoleKeyJwtClaims(key: string) {
  const parts = key.split(".");
  if (parts.length !== 3 || !key.startsWith("eyJ")) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const payload = JSON.parse(payloadJson) as {
      role?: unknown;
      iss?: unknown;
      exp?: unknown;
    };

    return {
      role: typeof payload.role === "string" ? payload.role : undefined,
      iss: typeof payload.iss === "string" ? payload.iss : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

function logServiceRoleKeyJwtClaims(context: string, key: string) {
  const claims = decodeServiceRoleKeyJwtClaims(key);

  if (!claims) {
    console.log(
      `[Supabase admin diagnostic:${context}] jwt role claim: unavailable (key is not a JWT)`,
    );
    return;
  }

  console.log(
    `[Supabase admin diagnostic:${context}] jwt role claim: ${claims.role ?? "missing"}`,
  );

  if (claims.iss) {
    console.log(
      `[Supabase admin diagnostic:${context}] jwt iss claim: ${claims.iss}`,
    );
  }

  if (claims.exp !== undefined) {
    console.log(
      `[Supabase admin diagnostic:${context}] jwt exp claim: ${claims.exp}`,
    );
  }
}

/** Temporary booking diagnostic — remove after service role access is verified. */
export async function logSupabaseAdminDiagnostics(context = "booking") {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyPresent = Boolean(serviceRoleKey);

  console.log(`[Supabase admin diagnostic:${context}] admin key present: ${keyPresent ? "yes" : "no"}`);

  if (serviceRoleKey) {
    console.log(
      `[Supabase admin diagnostic:${context}] admin key prefix (8 chars): ${serviceRoleKey.slice(0, 8)}`,
    );
    console.log(
      `[Supabase admin diagnostic:${context}] admin key format: ${describeServiceRoleKeyFormat(serviceRoleKey)}`,
    );
    logServiceRoleKeyJwtClaims(context, serviceRoleKey);
  }

  if (!keyPresent || !supabaseUrl) {
    console.log(
      `[Supabase admin diagnostic:${context}] admin class_sessions read: fail`,
    );
    console.log(
      `[Supabase admin diagnostic:${context}] error message: ${!keyPresent ? "SUPABASE_SERVICE_ROLE_KEY is not set" : "NEXT_PUBLIC_SUPABASE_URL is not set"}`,
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("class_sessions")
    .select("id")
    .limit(1);

  if (error) {
    console.log(
      `[Supabase admin diagnostic:${context}] admin class_sessions read: fail`,
    );
    console.log(
      `[Supabase admin diagnostic:${context}] error code: ${error.code ?? "unknown"}`,
    );
    console.log(
      `[Supabase admin diagnostic:${context}] error message: ${error.message}`,
    );
    return;
  }

  console.log(
    `[Supabase admin diagnostic:${context}] admin class_sessions read: success`,
  );
}
