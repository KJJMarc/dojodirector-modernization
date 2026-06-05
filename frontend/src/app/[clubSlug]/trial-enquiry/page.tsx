import type { Metadata } from "next";
import { TrialEnquiryForm } from "@/components/leads/trial-enquiry-form";
import { AppHeader } from "@/components/layout/app-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface TrialEnquiryPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: TrialEnquiryPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Request Your Free Trial`,
    description: `Request your free trial at ${club.name}. Beginner friendly — no experience required.`,
  };
}

export default async function TrialEnquiryPage({ params }: TrialEnquiryPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-4 pb-8 sm:px-5">
        <AppHeader pageTitle="Request Your Free Trial" clubName={club.name} />

        <p className="text-sm leading-relaxed text-dojo-muted">
          Beginner friendly. No experience required. Tell us a little about yourself and
          we&apos;ll help you find the right class.
        </p>

        <TrialEnquiryForm clubSlug={club.slug} />
      </main>

      <PublicSiteFooter />
    </div>
  );
}
