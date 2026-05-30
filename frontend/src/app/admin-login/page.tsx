import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Dojo Director | Admin access",
  description: "Temporary admin entry for Dojo Director.",
  robots: { index: false, follow: false },
};

/**
 * Temporary admin entry — not linked from the public homepage.
 * Real admin authentication will replace this route later.
 */
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-12 text-neutral-900">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dojo-red">
          {PRODUCT_NAME}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Admin access</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Temporary entry point for administrators. This page is not linked from
          the public site.
        </p>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Real admin authentication is coming later. Do not rely on this URL for
          security.
        </p>

        <Link
          href="/super-admin"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-dojo-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red-hover"
        >
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
