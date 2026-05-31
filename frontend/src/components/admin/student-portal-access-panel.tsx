import Link from "next/link";
import { StudentPortalSetPasswordForm } from "@/components/admin/student-portal-set-password-form";
import {
  formatProfileDate,
  type AdminStudentAgreementAccessSummary,
  type AdminStudentPortalAccessSummary,
} from "@/lib/admin-student-profile.shared";
import { SIGNATORY_TYPE_PARENT_GUARDIAN } from "@/lib/student-portal-agreements.shared";

interface StudentPortalAccessPanelProps {
  clubSlug: string;
  loginEmail: string | null;
  portalAccess: AdminStudentPortalAccessSummary;
  agreementAccess: AdminStudentAgreementAccessSummary;
  studentUserId: string;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-dojo-white">{value}</dd>
    </div>
  );
}

export function StudentPortalAccessPanel({
  clubSlug,
  loginEmail,
  portalAccess,
  agreementAccess,
  studentUserId,
}: StudentPortalAccessPanelProps) {
  const agreementPdfHref = `/api/admin/students/${studentUserId}/membership-agreement-pdf`;
  const showAgreementDetails = agreementAccess.isComplete;
  const showParticipantDetails =
    agreementAccess.signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN ||
    Boolean(agreementAccess.participantName);

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          STUDENT PORTAL ACCESS
        </h3>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailItem
          label="Student portal status"
          value={portalAccess.portalStatusLabel}
        />
        <DetailItem label="Student portal login email" value={loginEmail ?? "—"} />
        <DetailItem
          label="Student portal invite sent date"
          value={formatProfileDate(portalAccess.inviteSentAt)}
        />
      </dl>

      <div className="space-y-2 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Student portal password
        </h4>
        <StudentPortalSetPasswordForm
          clubSlug={clubSlug}
          userId={studentUserId}
          canSetPassword={portalAccess.canSetPassword}
        />
      </div>

      <div className="space-y-3 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Student portal agreement status
        </h4>

        {showAgreementDetails ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Status" value={agreementAccess.statusLabel} />
              <DetailItem
                label="Membership agreement version"
                value={agreementAccess.agreementVersionLabel}
              />
              <DetailItem
                label="Accepted date"
                value={formatProfileDate(agreementAccess.acceptedAt)}
              />
              <DetailItem
                label="Signed name"
                value={agreementAccess.signedFullName ?? "—"}
              />
              <DetailItem
                label="Signatory type"
                value={
                  agreementAccess.signatoryTypeLabel
                    ? agreementAccess.signatoryTypeLabel
                    : "—"
                }
              />
              {showParticipantDetails ? (
                <>
                  <DetailItem
                    label="Participant name"
                    value={agreementAccess.participantName ?? "—"}
                  />
                  <DetailItem
                    label="Relationship"
                    value={agreementAccess.relationshipToParticipant ?? "—"}
                  />
                </>
              ) : null}
            </dl>

            {agreementAccess.hasAgreementPdf ? (
              <Link
                href={agreementPdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
              >
                Download PDF
              </Link>
            ) : (
              <p className="text-sm text-dojo-muted">PDF unavailable</p>
            )}
          </>
        ) : (
          <p className="text-sm text-dojo-muted">
            Membership Agreement — Not accepted
          </p>
        )}
      </div>
    </section>
  );
}
