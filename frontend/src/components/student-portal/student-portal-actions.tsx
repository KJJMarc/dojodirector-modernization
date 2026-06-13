import Link from "next/link";
import {
  buildStudentPortalQuickActions,
  type StudentPortalUiConfig,
} from "@/lib/student-portal-routing.shared";

const PORTAL_ACTION_CARD_CLASSNAME =
  "flex min-h-[88px] items-center justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 text-center transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

interface StudentPortalActionsProps {
  clubSlug: string;
  userId: string;
  uiConfig: StudentPortalUiConfig;
  showAdultBeltRankings: boolean;
  unreadMessageCount?: number;
}

export function StudentPortalActions({
  clubSlug,
  userId,
  uiConfig,
  showAdultBeltRankings,
  unreadMessageCount = 0,
}: StudentPortalActionsProps) {
  const actions = buildStudentPortalQuickActions({
    clubSlug,
    userId,
    uiConfig,
    showAdultBeltRankings,
    unreadMessageCount,
  });

  return (
    <section aria-label="Portal navigation">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map(({ label, href, openInNewTab }) => (
          <Link
            key={href}
            href={href}
            className={PORTAL_ACTION_CARD_CLASSNAME}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
          >
            <span className="text-base font-semibold text-dojo-white">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
