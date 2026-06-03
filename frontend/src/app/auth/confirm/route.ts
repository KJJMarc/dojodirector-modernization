import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function resolveSafeNextPath(next: string | null) {
  const value = next?.trim() || "/reset-password";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/reset-password";
  }

  return value;
}

function invalidRedirectPath(nextPath: string, origin: string) {
  const url = new URL("/reset-password", origin);
  url.searchParams.set("error", "invalid");

  if (nextPath.includes("setup=1") || nextPath.includes("setup=true")) {
    url.searchParams.set("setup", "1");
  }

  const contextMatch = nextPath.match(/[?&]context=(admin|super_admin|instructor|student)/);

  if (contextMatch?.[1]) {
    url.searchParams.set("context", contextMatch[1]);
  }

  return url;
}

function logConfirmFailure(message: string) {
  console.error("[password-reset-confirm]", { message });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const nextPath = resolveSafeNextPath(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logConfirmFailure("Missing Supabase environment variables.");
    return NextResponse.redirect(invalidRedirectPath(nextPath, url.origin));
  }

  const cookieStore = cookies();
  let supabaseResponse = NextResponse.redirect(new URL(nextPath, url.origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });

        supabaseResponse = NextResponse.redirect(new URL(nextPath, url.origin));
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return supabaseResponse;
    }

    logConfirmFailure(error.message);
    return NextResponse.redirect(invalidRedirectPath(nextPath, url.origin));
  }

  if (!tokenHash || type !== "recovery") {
    logConfirmFailure("Missing token_hash or recovery type on confirm URL.");
    return NextResponse.redirect(invalidRedirectPath(nextPath, url.origin));
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    logConfirmFailure(error.message);
    return NextResponse.redirect(invalidRedirectPath(nextPath, url.origin));
  }

  return supabaseResponse;
}
