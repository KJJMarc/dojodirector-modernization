import Link from "next/link";
import { clubPortalAccessPath } from "@/lib/portal-access.shared";

interface MessagingPortalAccessCardProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-surface active:scale-[0.99]";

export function MessagingPortalAccessCard({ clubSlug }: MessagingPortalAccessCardProps) {
  return (
    <Link href={clubPortalAccessPath(clubSlug)} className={actionCardClassName}>
      <span className="text-base font-semibold text-dojo-white">Portal Access</span>
      <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
        Send portal setup emails to individual students or review and invite eligible
        students in controlled batches.
      </span>
    </Link>
  );
}
