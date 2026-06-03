import { type NextRequest, NextResponse } from "next/server";
import { isStudentPortalUserIdParam } from "@/lib/student-portal-routing.shared";
import { updateSupabaseSession } from "@/lib/supabase/middleware-auth";

function maybeRedirectLegacyStudentPortalPath(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/student-portal\/([^/]+)(\/.*)?$/);

  if (!match) {
    return null;
  }

  const firstSegment = decodeURIComponent(match[1]);

  if (!isStudentPortalUserIdParam(firstSegment)) {
    return null;
  }

  const rest = match[2] ?? "";
  const url = request.nextUrl.clone();
  url.pathname = `/student-portal/legacy/${firstSegment}${rest}`;

  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const legacyRedirect = maybeRedirectLegacyStudentPortalPath(request);

  if (legacyRedirect) {
    return legacyRedirect;
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/student-portal/:path*",
    "/portal/:path*",
    "/admin/:path*",
    "/admin-access/:path*",
    "/super-admin",
    "/super-admin/:path*",
    "/forgot-password",
    "/reset-password",
    "/setup-password",
    "/auth/:path*",
  ],
};
