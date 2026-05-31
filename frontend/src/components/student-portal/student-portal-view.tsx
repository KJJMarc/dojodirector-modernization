import { StudentPortalActions } from "@/components/student-portal/student-portal-actions";
import { StudentPortalAgreementsPanel } from "@/components/student-portal/student-portal-agreements-panel";
import { StudentPortalAttendanceSection } from "@/components/student-portal/student-portal-attendance-section";
import { formatMembershipStatus } from "@/lib/admin-student-profile.shared";
import type { StudentPortalPageData } from "@/lib/student-portal.shared";

interface StudentPortalViewProps {
  userId: string;
  pageData: StudentPortalPageData;
  year: number;
}

export function StudentPortalView({
  userId,
  pageData,
  year,
}: StudentPortalViewProps) {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">{pageData.studentName}</h2>
        <p className="text-sm text-dojo-muted">
          <span className="text-dojo-white">Current Belt:</span> {pageData.currentBeltLabel}
        </p>
        <p className="text-sm text-dojo-muted">
          <span className="text-dojo-white">Membership:</span>{" "}
          {formatMembershipStatus(pageData.membershipStatus)}
        </p>
      </section>

      <StudentPortalActions userId={userId} />

      <StudentPortalAgreementsPanel status={pageData.agreementStatus} />

      <StudentPortalAttendanceSection
        userId={userId}
        pageData={pageData}
        year={year}
      />
    </div>
  );
}
