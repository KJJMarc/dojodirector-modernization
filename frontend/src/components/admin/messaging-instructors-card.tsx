import Link from "next/link";
import { clubInstructorsMessagingPath } from "@/lib/academy-messaging.shared";

interface MessagingInstructorsCardProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-surface active:scale-[0.99]";

export function MessagingInstructorsCard({ clubSlug }: MessagingInstructorsCardProps) {
  return (
    <Link href={clubInstructorsMessagingPath(clubSlug)} className={actionCardClassName}>
      <span className="text-base font-semibold text-dojo-white">Message Instructors</span>
      <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
        Send messages to Instructor Portal users.
      </span>
    </Link>
  );
}
