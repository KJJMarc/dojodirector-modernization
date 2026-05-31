import Link from "next/link";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import type {
  AdminDashboardAccessSummary,
  AdminInstructorPortalAccessSummary,
  AdminStudentAgreementAccessSummary,
  AdminStudentPortalAccessSummary,
} from "@/lib/admin-student-profile.shared";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";

interface ProfileAccessAgreementsPanelProps {
  studentUserId: string;
  membershipRole: string | null;
  portalAccess: AdminStudentPortalAccessSummary;
  agreementAccess: AdminStudentAgreementAccessSummary;
  instructorPortalAccess: AdminInstructorPortalAccessSummary | null;
  showAdminDashboardAccess: boolean;
  adminAccess: AdminDashboardAccessSummary | null;
}

function AccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-dojo-border/60 py-1.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
        {label}
      </span>
      <span className="text-sm leading-snug text-dojo-white sm:text-right">{value}</span>
    </div>
  );
}

function formatAdminRoleLabel(
  membershipRole: string | null,
  adminAccess: AdminDashboardAccessSummary | null,
) {
  if (adminAccess?.isPlatformSuperAdmin || isSuperAdminMembershipRole(membershipRole)) {
    return "Super admin";
  }

  const normalizedRole = membershipRole?.trim().toLowerCase();

  if (normalizedRole === "owner") {
    return "Owner";
  }

  if (normalizedRole === "admin" || adminAccess?.isClubAdmin) {
    return "Club admin";
  }

  return "—";
}

export function ProfileAccessAgreementsPanel({
  studentUserId,
  membershipRole,
  portalAccess,
  agreementAccess,
  instructorPortalAccess,
  showAdminDashboardAccess,
  adminAccess,
}: ProfileAccessAgreementsPanelProps) {
  const agreementPdfHref = `/api/admin/students/${studentUserId}/membership-agreement-pdf`;
  const adminEnabled = showAdminDashboardAccess && Boolean(adminAccess);
  const instructorEnabled = Boolean(instructorPortalAccess);

  return (
    <section className={profileSectionClassName}>
      <ProfileSectionHeading title="Access & Agreements" />

      <div className="rounded-lg border border-dojo-border bg-dojo-elevated/40 px-3">
        <AccessRow
          label="Student portal"
          value={portalAccess.portalStatusLabel}
        />
        <AccessRow
          label="Agreement"
          value={
            agreementAccess.isComplete
              ? agreementAccess.statusLabel
              : "Not accepted"
          }
        />
        <AccessRow
          label="Instructor access"
          value={instructorEnabled ? "Enabled" : "Disabled"}
        />
        {instructorEnabled ? (
          <AccessRow
            label="Instructor portal status"
            value={instructorPortalAccess?.portalStatusLabel ?? "—"}
          />
        ) : null}
        <AccessRow
          label="Admin access"
          value={adminEnabled ? "Enabled" : "Disabled"}
        />
        {adminEnabled ? (
          <AccessRow
            label="Admin role"
            value={formatAdminRoleLabel(membershipRole, adminAccess)}
          />
        ) : null}
      </div>

      {agreementAccess.isComplete && agreementAccess.hasAgreementPdf ? (
        <Link
          href={agreementPdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          Download agreement PDF
        </Link>
      ) : null}

      {agreementAccess.isComplete ? (
        <dl className={`${profileDetailGridClassName} border-t border-dojo-border pt-2`}>
          <ProfileDetailItem
            label="Agreement version"
            value={agreementAccess.agreementVersionLabel}
          />
          <ProfileDetailItem
            label="Accepted"
            value={formatProfileDate(agreementAccess.acceptedAt)}
          />
          <ProfileDetailItem
            label="Signed name"
            value={agreementAccess.signedFullName ?? "—"}
          />
        </dl>
      ) : null}
    </section>
  );
}
