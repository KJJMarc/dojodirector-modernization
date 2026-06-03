import Link from "next/link";
import { clubAcademyEmailSettingsPath } from "@/lib/academy-email.shared";

interface MessagingAcademyEmailCardProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-surface active:scale-[0.99]";

export function MessagingAcademyEmailCard({ clubSlug }: MessagingAcademyEmailCardProps) {
  return (
    <Link href={clubAcademyEmailSettingsPath(clubSlug)} className={actionCardClassName}>
      <span className="text-base font-semibold text-dojo-white">Set Academy Email</span>
      <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
        Configure the academy contact email, reply-to email, sender display name and email
        enabled status.
      </span>
    </Link>
  );
}
