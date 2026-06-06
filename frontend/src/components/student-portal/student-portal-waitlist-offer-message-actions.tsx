"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  acceptWaitlistOfferFromStudentPortal,
  declineWaitlistOfferFromStudentPortal,
} from "@/app/student-portal/[clubSlug]/[userId]/actions";
import { WaitlistOfferMessagePanel } from "@/components/student-portal/waitlist-offer-message-panel";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";
import { formatStudentPortalActionSuccessMessage } from "@/lib/student-portal-action-result.shared";
import type { StudentPortalActionResult } from "@/lib/student-portal-action-result.shared";
import { WAITLIST_ACCEPT_SUCCESS_MESSAGE } from "@/lib/session-waitlist.shared";

interface StudentPortalWaitlistOfferMessageActionsProps {
  clubSlug: string;
  userId: string;
  message: PortalMessageListItem;
  onActionError: (message: string | null) => void;
  onActionSuccess: (message: string | null) => void;
}

export function StudentPortalWaitlistOfferMessageActions({
  clubSlug,
  userId,
  message,
  onActionError,
  onActionSuccess,
}: StudentPortalWaitlistOfferMessageActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const offer = message.waitlistOffer;

  if (!offer) {
    return null;
  }

  const runOfferAction = (
    action: () => Promise<StudentPortalActionResult>,
    successText: string,
  ) => {
    onActionError(null);
    onActionSuccess(null);

    startTransition(async () => {
      try {
        const result = await action();
        onActionError(null);
        onActionSuccess(formatStudentPortalActionSuccessMessage(successText, result));
        router.refresh();
      } catch (error) {
        onActionSuccess(null);
        onActionError(
          error instanceof Error
            ? error.message
            : "We could not complete your request. Please try again.",
        );
      }
    });
  };

  return (
    <WaitlistOfferMessagePanel
      offer={offer}
      isPending={isPending}
      onAccept={() =>
        runOfferAction(
          () =>
            acceptWaitlistOfferFromStudentPortal(clubSlug, userId, offer.sessionId),
          WAITLIST_ACCEPT_SUCCESS_MESSAGE,
        )
      }
      onDecline={() =>
        runOfferAction(
          () =>
            declineWaitlistOfferFromStudentPortal(clubSlug, userId, offer.sessionId),
          "You declined the waitlist offer for [class].",
        )
      }
    />
  );
}
