import type { Metadata } from "next";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { getAdminMfaChallengePageState } from "./actions";
import { AdminMfaVerifyForm } from "./admin-mfa-verify-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Two-Factor Verification",
  description: "Enter your authenticator code to continue to admin access.",
  robots: { index: false, follow: false },
};

interface AdminMfaVerifyPageProps {
  searchParams: { next?: string };
}

export default async function AdminMfaVerifyPage({
  searchParams,
}: AdminMfaVerifyPageProps) {
  const { next } = await getAdminMfaChallengePageState(searchParams.next);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
        <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
        <h1 className="mt-3 text-2xl font-semibold text-dojo-white">
          Two-factor verification
        </h1>
        <div className="mt-6">
          <AdminMfaVerifyForm next={next} />
        </div>
      </div>
    </main>
  );
}
