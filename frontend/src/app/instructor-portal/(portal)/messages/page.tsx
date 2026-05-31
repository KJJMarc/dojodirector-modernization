import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalSignOutButton } from "@/components/instructor-portal/instructor-portal-sign-out-button";
import { InstructorPortalUnlinkedProfile } from "@/components/instructor-portal/instructor-portal-unlinked-profile";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { resolveInstructorPortalSessionState } from "@/lib/instructor-portal-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Instructor Messages",
  description: "Instructor portal messages.",
};

export default async function InstructorPortalMessagesPage() {
  const session = await resolveInstructorPortalSessionState();

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Messages" clubName={ACTIVE_CLUB_NAME} />

        <InstructorPortalHomeLink />

        <InstructorPortalUnlinkedProfile />
      </main>
    );
  }

  if (session.status !== "authenticated") {
    return null;
  }

  const { profile } = session;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messages" clubName={ACTIVE_CLUB_NAME} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/instructor-portal"
          className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Instructor Portal
        </Link>
        <InstructorPortalSignOutButton />
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center">
        <h2 className="text-xl font-semibold text-dojo-white">Messages</h2>
        <p className="text-sm text-dojo-muted">Coming soon</p>
        <p className="text-xs text-dojo-muted">Signed in as {profile.fullName}</p>
      </section>
    </main>
  );
}
