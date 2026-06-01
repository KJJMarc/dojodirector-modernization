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
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      // Next.js App Router caches fetch() by default; admin reads must be fresh.
      fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
    },
  });
}
