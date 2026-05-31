import { type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware-auth";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/student-portal/:path*",
    "/admin/:path*",
    "/admin-access/:path*",
    "/super-admin",
  ],
};
