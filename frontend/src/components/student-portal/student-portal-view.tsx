import { StudentPortalActions } from "@/components/student-portal/student-portal-actions";
import { StudentPortalAgreementsPanel } from "@/components/student-portal/student-portal-agreements-panel";
import { StudentPortalAttendanceSection } from "@/components/student-portal/student-portal-attendance-section";
import { formatMembershipStatus } from "@/lib/admin-student-profile.shared";
import type { StudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import type { StudentPortalPageData } from "@/lib/student-portal.shared";

interface StudentPortalViewProps {
  clubSlug: string;
  userId: string;
  uiConfig: StudentPortalUiConfig;
  pageData: StudentPortalPageData;
  year: number;
  unreadMessageCount?: number;
}

export function StudentPortalView({
  clubSlug,
  userId,
  uiConfig,
  pageData,
  year,
  unreadMessageCount = 0,
}: StudentPortalViewProps) {
  const showAdultAttendanceCard =
    uiConfig.showAdultAttendanceCard && pageData.showBjjAttendanceCard;
  const showCurrentBelt = pageData.showCurrentBelt && uiConfig.showAdultAttendanceCard;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">{pageData.studentName}</h2>
        {showCurrentBelt ? (
          <p className="text-sm text-dojo-muted">
            <span className="text-dojo-white">Current Belt:</span>{" "}
            {pageData.currentBeltLabel}
          </p>
        ) : null}
        <p className="text-sm text-dojo-muted">
          <span className="text-dojo-white">Membership:</span>{" "}
          {formatMembershipStatus(pageData.membershipStatus)}
        </p>
      </section>

      <StudentPortalActions
        clubSlug={clubSlug}
        userId={userId}
        uiConfig={uiConfig}
        showAdultBeltRankings={pageData.showBjjPortalActions}
        unreadMessageCount={unreadMessageCount}
      />

      {uiConfig.showAgreementsPanel ? (
        <StudentPortalAgreementsPanel status={pageData.agreementStatus} />
      ) : null}

      {showAdultAttendanceCard ? (
        <StudentPortalAttendanceSection
          clubSlug={clubSlug}
          userId={userId}
          pageData={pageData}
          year={year}
        />
      ) : null}
    </div>
  );
}
