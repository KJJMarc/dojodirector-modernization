import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalMessagesInbox } from "@/components/student-portal/student-portal-messages-inbox";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { listPortalMessagesForRecipient } from "@/lib/portal-messages.server";
import {
  parseWaitlistOfferSessionIdFromBody,
  WAITLIST_OFFER_MESSAGE_SUBJECT,
} from "@/lib/session-waitlist.shared";
import {
  enrichPortalMessagesWithWaitlistOffers,
  loadActiveWaitlistOffersForUser,
  loadMemberBookedSessionIdsForUser,
} from "@/lib/session-waitlist.server";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";

export const dynamic = "force-dynamic";

interface StudentPortalMessagesPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalMessagesPageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `DojoDirector | Messages | ${uiConfig.pageTitle}`,
    description: "Member portal messages.",
  };
}

export default async function StudentPortalMessagesPage({
  params,
}: StudentPortalMessagesPageProps) {
  const { club, profile } = await requireStudentPortalPageContext(
    params.clubSlug,
    params.userId,
  );
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showMessages) {
    notFound();
  }

  const rawMessages = await listPortalMessagesForRecipient({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "student",
  });
  const waitlistSessionIds = rawMessages.flatMap((message) => {
    if (message.subject !== WAITLIST_OFFER_MESSAGE_SUBJECT) {
      return [];
    }

    const sessionId = parseWaitlistOfferSessionIdFromBody(message.body);
    return sessionId ? [sessionId] : [];
  });
  const [activeOffersBySessionId, bookedSessionIds] = await Promise.all([
    loadActiveWaitlistOffersForUser(profile.userId),
    loadMemberBookedSessionIdsForUser(profile.userId, waitlistSessionIds),
  ]);
  const messages = enrichPortalMessagesWithWaitlistOffers(
    rawMessages,
    activeOffersBySessionId,
    bookedSessionIds,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messages" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalMessagesInbox
        clubSlug={club.slug}
        userId={params.userId}
        messages={messages}
      />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
