"use client";

import { WaitlistOfferActions } from "@/components/student-portal/waitlist-offer-actions";
import type { PortalMessageWaitlistOfferAction } from "@/lib/portal-messages.shared";
import {
  WAITLIST_ACCEPT_SUCCESS_MESSAGE,
  WAITLIST_OFFER_UNAVAILABLE_MESSAGE,
} from "@/lib/session-waitlist.shared";

interface WaitlistOfferMessagePanelProps {
  offer: PortalMessageWaitlistOfferAction;
  isPending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function WaitlistOfferMessagePanel({
  offer,
  isPending,
  onAccept,
  onDecline,
}: WaitlistOfferMessagePanelProps) {
  if (offer.isBookingConfirmed) {
    return (
      <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm text-dojo-white">
        {WAITLIST_ACCEPT_SUCCESS_MESSAGE}
      </p>
    );
  }

  if (!offer.isOfferActive) {
    return (
      <p className="rounded-md border border-dojo-border bg-dojo-elevated px-3 py-3 text-sm text-dojo-muted">
        {WAITLIST_OFFER_UNAVAILABLE_MESSAGE}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-3 py-3">
      <WaitlistOfferActions
        expiresAt={offer.expiresAt}
        isPending={isPending}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </div>
  );
}
