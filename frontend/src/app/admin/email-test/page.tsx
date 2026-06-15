import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmailTestForm } from "@/components/admin/admin-email-test-form";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { requireAdminLoginSession } from "@/lib/admin-auth.server";
import { listAdminEmailTestAcademies } from "@/lib/admin-email-test.server";
import { adminAcademySelectPath } from "@/lib/admin-auth.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Email Test",
  description: "Send a test email through Resend for an academy.",
  robots: { index: false, follow: false },
};

export default async function AdminEmailTestPage() {
  const { authUserId } = await requireAdminLoginSession();
  const academies = await listAdminEmailTestAcademies(authUserId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-8 sm:px-5">
      <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
      <h1 className="mt-3 text-2xl font-semibold text-dojo-white">Email test</h1>
      <p className="mt-2 text-sm text-dojo-muted">
        Send a one-off test message through Resend using each academy&apos;s display name and
        reply-to settings. Replies go to the academy reply-to address.
      </p>

      <div className="mt-8">
        <AdminEmailTestForm academies={academies} />
      </div>

      <Link
        href={adminAcademySelectPath()}
        className="mt-8 inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to academy selection
      </Link>
    </main>
  );
}
