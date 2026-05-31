import {
  formatMembershipAgreementDisplayLabel,
  type StudentAgreementStatusSummary,
} from "@/lib/student-portal-agreements.shared";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";

interface StudentPortalAgreementsPanelProps {
  status: StudentAgreementStatusSummary;
}

export function StudentPortalAgreementsPanel({
  status,
}: StudentPortalAgreementsPanelProps) {
  return (
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        AGREEMENTS
      </h3>

      {status.isComplete ? (
        <div className="space-y-1 text-sm text-dojo-muted">
          <p className="text-dojo-white">
            ✓ {formatMembershipAgreementDisplayLabel(status.version)}
          </p>
          {status.signedFullName ? (
            <p>Signed as: {status.signedFullName}</p>
          ) : null}
          {status.acceptedAt ? (
            <p>Accepted: {formatProfileDate(status.acceptedAt)}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm font-medium text-dojo-white">Agreement Required</p>
      )}
    </section>
  );
}
