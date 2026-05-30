import type { Metadata } from "next";
import { InstructorPortalHeader } from "@/components/instructor/instructor-portal-header";
import { InstructorQuickActions } from "@/components/instructor/instructor-quick-actions";
import { requireInstructorIdentityBySlug } from "@/lib/instructor-portal.server";

export const dynamic = "force-dynamic";

interface InstructorDashboardPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: InstructorDashboardPageProps): Promise<Metadata> {
  const identity = await requireInstructorIdentityBySlug(params.slug);

  return {
    title: `DojoDirector | ${identity.displayName}`,
    description: "Instructor dashboard for class attendance and schedules.",
  };
}

export default async function InstructorDashboardPage({
  params,
}: InstructorDashboardPageProps) {
  const identity = await requireInstructorIdentityBySlug(params.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <InstructorPortalHeader slug={identity.slug} instructorName={identity.displayName} />
      <InstructorQuickActions slug={identity.slug} />
    </main>
  );
}
