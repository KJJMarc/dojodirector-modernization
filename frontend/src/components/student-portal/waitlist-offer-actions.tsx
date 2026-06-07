"use client";

import { useEffect, useState } from "react";
import { formatWaitlistOfferCountdown } from "@/lib/session-waitlist.shared";

interface WaitlistOfferActionsProps {
  expiresAt: string | null;
  isPending: boolean;
  onAccept: () => void;
  onDecline: () => void;
  acceptLabel?: string;
  declineLabel?: string;
  layout?: "stacked" | "inline";
}

function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState(() => formatWaitlistOfferCountdown(expiresAt));

  useEffect(() => {
    const tick = () => setLabel(formatWaitlistOfferCountdown(expiresAt));
    tick();
    const intervalId = window.setInterval(tick, 30_000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  if (!label) {
    return null;
  }

  return <p className="text-xs font-medium text-dojo-amber-200">{label}</p>;
}

export function WaitlistOfferActions({
  expiresAt,
  isPending,
  onAccept,
  onDecline,
  acceptLabel,
  declineLabel,
  layout = "stacked",
}: WaitlistOfferActionsProps) {
  const buttonClass =
    layout === "inline"
      ? "min-h-[40px] flex-1 rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      : "min-h-[40px] w-full rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-2">
      {expiresAt ? <OfferCountdown expiresAt={expiresAt} /> : null}
      <div className={layout === "inline" ? "flex flex-wrap gap-2" : "space-y-2"}>
        <button
          type="button"
          disabled={isPending}
          onClick={onAccept}
          className={`${buttonClass} bg-green-600 text-white ring-1 ring-green-500 hover:bg-green-500`}
        >
          {acceptLabel ?? "Accept Booking"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDecline}
          className={`${buttonClass} border border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50`}
        >
          {declineLabel ?? "Decline Place"}
        </button>
      </div>
    </div>
  );
}
