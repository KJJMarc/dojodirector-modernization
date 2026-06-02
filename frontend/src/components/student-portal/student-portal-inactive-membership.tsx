import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";
import {
  formatMembershipStatusLabel,
  STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE,
} from "@/lib/membership-status.shared";

interface StudentPortalInactiveMembershipProps {
  membershipStatus?: string | null;
}

export function StudentPortalInactiveMembership({
  membershipStatus,
}: StudentPortalInactiveMembershipProps) {
  const statusLabel = membershipStatus
    ? formatMembershipStatusLabel(membershipStatus)
    : null;

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Membership not active</h2>
        <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
          {STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE}
        </p>
        {statusLabel ? (
          <p className="mt-2 text-xs text-dojo-muted">
            Current membership status: {statusLabel}
          </p>
        ) : null}
      </div>

      <StudentPortalSignOutButton />
    </section>
  );
}
