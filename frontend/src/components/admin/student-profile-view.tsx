import Link from "next/link";
import { AdminAccessPanel } from "@/components/admin/admin-access-panel";
import { InstructorPortalAccessPanel } from "@/components/admin/instructor-portal-access-panel";
import { StudentPortalAccessPanel } from "@/components/admin/student-portal-access-panel";
import { StudentProfileMembershipManager } from "@/components/admin/student-profile-membership-manager";
import { resolveInstructorPortalLoginEmail } from "@/lib/instructor-portal-auth.shared";
import { resolvePortalLoginEmail } from "@/lib/student-portal-auth.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  formatPromotionProgressLabel,
  formatPromotionRequiredTimeLabel,
  formatPromotionTimeProgressLabel,
  formatPromotionTimeSinceLabel,
} from "@/lib/admin-belt-promotion.shared";
import {
  formatMembershipStatus,
  formatProfileDate,
  formatProfileField,
  type AdminStudentProfilePageData,
} from "@/lib/admin-student-profile.shared";

const ATTENDANCE_CARD_YEAR = 2026;

interface StudentProfileViewProps {
  clubSlug: string;
  pageData: AdminStudentProfilePageData;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-dojo-white">{value}</dd>
    </div>
  );
}

function PlaceholderButton({ label }: { label: string }) {
  return (
    <span
      className="inline-flex min-h-[36px] cursor-not-allowed items-center justify-center rounded-md border border-dojo-border/60 bg-dojo-elevated/60 px-3 py-1.5 text-xs font-semibold text-dojo-muted"
      title="Coming soon"
      aria-disabled="true"
    >
      {label}
    </span>
  );
}

function ActionButton({
  href,
  label,
  variant = "default",
}: {
  href: string;
  label: string;
  variant?: "default" | "secondary";
}) {
  const className =
    variant === "secondary"
      ? "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
      : "inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function StudentProfileView({ clubSlug, pageData }: StudentProfileViewProps) {
  const {
    student,
    portalAccess,
    instructorPortalAccess,
    showAdminDashboardAccess,
    adminAccess,
    agreementAccess,
    attendance,
    belt,
    gradeHistory,
  } = pageData;
  const loginEmail = resolvePortalLoginEmail(
    portalAccess.portalLoginEmail,
    student.email,
  );
  const instructorLoginEmail = instructorPortalAccess
    ? resolveInstructorPortalLoginEmail(
        instructorPortalAccess.portalLoginEmail,
        student.email,
      )
    : null;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-dojo-white">{student.fullName}</h2>
            <p className="mt-1 text-sm text-dojo-muted">Student Profile</p>
          </div>
          <ActionButton
            href={clubAdminPath(clubSlug, `students/${student.id}/edit`)}
            label="Edit Student"
            variant="secondary"
          />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Full name" value={student.fullName} />
          <DetailItem label="Email" value={formatProfileField(student.email)} />
          <DetailItem label="Phone" value={formatProfileField(student.phone)} />
          <DetailItem
            label="Date of birth"
            value={formatProfileDate(student.dateOfBirth)}
          />
          <DetailItem label="Role" value={student.role ?? "—"} />
          <DetailItem
            label="Membership status"
            value={formatMembershipStatus(student.membershipStatus)}
          />
          <div className="sm:col-span-2">
            <DetailItem label="Address" value={formatProfileField(student.address)} />
          </div>
          {student.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                Notes
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-dojo-white">
                {student.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <StudentProfileMembershipManager clubSlug={clubSlug} student={student} />

      {showAdminDashboardAccess && adminAccess ? (
        <AdminAccessPanel
          clubSlug={clubSlug}
          userId={student.id}
          adminAccess={adminAccess}
        />
      ) : null}

      {instructorPortalAccess ? (
        <InstructorPortalAccessPanel
          clubSlug={clubSlug}
          loginEmail={instructorLoginEmail}
          portalAccess={instructorPortalAccess}
          studentUserId={student.id}
        />
      ) : null}

      <StudentPortalAccessPanel
        clubSlug={clubSlug}
        loginEmail={loginEmail}
        portalAccess={portalAccess}
        agreementAccess={agreementAccess}
        studentUserId={student.id}
      />

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            ATTENDANCE SUMMARY
          </h3>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Lifetime BJJ attendance"
            value={String(attendance.lifetimeBjjCount)}
          />
          <DetailItem
            label="Last attendance"
            value={formatProfileDate(attendance.lastAttendanceDate)}
          />
        </dl>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            href={`/students/${student.id}/attendance-card?year=${ATTENDANCE_CARD_YEAR}`}
            label="Attendance Card"
          />
          <PlaceholderButton label="Attendance History" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            BELT / LEVEL SUMMARY
          </h3>
        </div>

        {belt.promotion?.isEligible ? (
          <div className="rounded-lg border border-dojo-red/30 bg-dojo-red/10 p-4">
            <h3 className="text-sm font-semibold text-dojo-white">
              Consider belt promotion
            </h3>
            <p className="mt-1 text-sm text-dojo-muted">
              This student appears to meet the attendance and time requirements
              for the next level.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem
                label="Current level"
                value={belt.promotion.currentBeltLabel}
              />
              <DetailItem
                label="Suggested next level"
                value={belt.promotion.nextBeltLabel}
              />
              <DetailItem
                label="Attendance since current level"
                value={formatPromotionProgressLabel(
                  belt.promotion.attendanceSinceAward,
                  belt.promotion.requiredAttendance,
                )}
              />
              <DetailItem
                label="Required attendance"
                value={String(belt.promotion.requiredAttendance)}
              />
              <DetailItem
                label="Time since current level"
                value={formatPromotionTimeSinceLabel(belt.promotion)}
              />
              <DetailItem
                label="Required time"
                value={formatPromotionRequiredTimeLabel(belt.promotion)}
              />
            </dl>
          </div>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Current belt level" value={belt.currentBeltLabel} />
          <DetailItem
            label="Awarded date"
            value={formatProfileDate(belt.currentBeltAwardedAt)}
          />
          <DetailItem
            label="Next belt level"
            value={belt.nextBeltLabel ?? "—"}
          />
          {belt.promotion && !belt.promotion.isEligible ? (
            <>
              <DetailItem
                label="Attendance since current level"
                value={formatPromotionProgressLabel(
                  belt.promotion.attendanceSinceAward,
                  belt.promotion.requiredAttendance,
                )}
              />
              <DetailItem
                label="Time since current level"
                value={formatPromotionTimeProgressLabel(belt.promotion)}
              />
            </>
          ) : null}
        </dl>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            href={clubAdminPath(clubSlug, `students/${student.id}/change-belt`)}
            label="Change Belt Level"
          />
          <ActionButton href="#grading-history" label="See Grading History" variant="secondary" />
        </div>
      </section>

      <section
        id="grading-history"
        className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4"
      >
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            GRADING HISTORY
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Previous belt and stripe awards for this student.
          </p>
        </div>

        {gradeHistory.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
            No grading history recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-4 py-3 font-semibold">Belt level</th>
                  <th className="px-4 py-3 font-semibold">Awarded</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {gradeHistory.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-dojo-white">
                      {entry.beltLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-dojo-muted">
                      {formatProfileDate(entry.awardedAt)}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {entry.notes?.trim() ? entry.notes : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
