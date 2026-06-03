import Link from "next/link";
import { clubGuestBookingEmailSettingsPath } from "@/lib/academy-email.shared";

interface MessagingGuestBookingEmailCardProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

export function MessagingGuestBookingEmailCard({
  clubSlug,
}: MessagingGuestBookingEmailCardProps) {
  return (
    <Link href={clubGuestBookingEmailSettingsPath(clubSlug)} className={actionCardClassName}>
      <span className="text-base font-semibold text-dojo-white">
        Guest Booking Email Settings
      </span>
      <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
        Configure guest booking confirmation and academy notification emails.
      </span>
    </Link>
  );
}
