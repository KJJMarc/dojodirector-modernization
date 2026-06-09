import Link from "next/link";
import { formatPortalMessagesNavLabel } from "@/lib/portal-messages.shared";
import {
  resolveStudentPortalGradingHistoryHref,
  studentPortalPath,
  type StudentPortalUiConfig,
} from "@/lib/student-portal-routing.shared";
import { studentOfTheYearPublicPath } from "@/lib/student-of-the-year.shared";

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
  const basePath = studentPortalPath(clubSlug, userId);
  const gradingHistoryHref = resolveStudentPortalGradingHistoryHref(
    clubSlug,
    userId,
    uiConfig,
  );

  const actions = [
    uiConfig.showBookClass
      ? { label: "Book a Class", href: `${basePath}/book`, openInNewTab: false }
      : null,
    uiConfig.showUpcomingBookings
      ? { label: "Cancel Bookings", href: `${basePath}/bookings`, openInNewTab: false }
      : null,
    uiConfig.showMessages
      ? {
          label: formatPortalMessagesNavLabel(unreadMessageCount),
          href: `${basePath}/messages`,
          openInNewTab: false,
        }
      : null,
    gradingHistoryHref && uiConfig.showGradingHistory
      ? {
          label: "Grading History",
          href: gradingHistoryHref,
          openInNewTab: gradingHistoryHref.startsWith("http"),
        }
      : null,
    uiConfig.showJuniorBeltLevels && uiConfig.juniorBeltRankingsHref
      ? {
          label: "Junior Belt Levels",
          href: uiConfig.juniorBeltRankingsHref,
          openInNewTab: true,
        }
      : null,
    showAdultBeltRankings && uiConfig.showAdultBeltRankings
      ? {
          label: "Adult Belt Rankings",
          href: "/adult-belt-rankings",
          openInNewTab: true,
        }
      : null,
    showAdultBeltRankings && uiConfig.showAdultBeltRankings
      ? {
          label: "Student of the Year",
          href: studentOfTheYearPublicPath(),
          openInNewTab: true,
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    href: string;
    openInNewTab: boolean;
  }[];

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
