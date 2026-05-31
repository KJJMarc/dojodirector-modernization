import Link from "next/link";
import { LoginAccessPanel } from "@/components/admin/login-access-panel";
import { ProfileAccessAgreementsPanel } from "@/components/admin/profile-access-agreements-panel";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import { StudentProfileMembershipManager } from "@/components/admin/student-profile-membership-manager";
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
    loginAccess,
    portalAccess,
    instructorPortalAccess,
    showAdminDashboardAccess,
    adminAccess,
    agreementAccess,
    attendance,
    belt,
    gradeHistory,
  } = pageData;
  return (
    <div className="space-y-2">
      <section className={profileSectionClassName}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold leading-snug text-dojo-white">
              {student.fullName}
            </h2>
            <p className="text-xs text-dojo-muted">Personal details</p>
          </div>
          <ActionButton
            href={clubAdminPath(clubSlug, `students/${student.id}/edit`)}
            label="Edit Student"
            variant="secondary"
          />
        </div>

        <dl className={profileDetailGridClassName}>
          <ProfileDetailItem label="Full name" value={student.fullName} />
          <ProfileDetailItem label="Email" value={formatProfileField(student.email)} />
          <ProfileDetailItem label="Phone" value={formatProfileField(student.phone)} />
          <ProfileDetailItem
            label="Date of birth"
            value={formatProfileDate(student.dateOfBirth)}
          />
          <ProfileDetailItem label="Role" value={student.role ?? "—"} />
          <ProfileDetailItem
            label="Membership status"
            value={formatMembershipStatus(student.membershipStatus)}
          />
          <div className="sm:col-span-2">
            <ProfileDetailItem label="Address" value={formatProfileField(student.address)} />
          </div>
          {student.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
                Notes
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-dojo-white">
                {student.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <StudentProfileMembershipManager clubSlug={clubSlug} student={student} />

      <LoginAccessPanel
        clubSlug={clubSlug}
        userId={student.id}
        loginAccess={loginAccess}
      />

      <ProfileAccessAgreementsPanel
        studentUserId={student.id}
        membershipRole={student.membershipRole}
        portalAccess={portalAccess}
        agreementAccess={agreementAccess}
        instructorPortalAccess={instructorPortalAccess}
        showAdminDashboardAccess={showAdminDashboardAccess}
        adminAccess={adminAccess}
      />

      <section className={profileSectionClassName}>
        <ProfileSectionHeading title="Attendance Summary" />

        <dl className={profileDetailGridClassName}>
          <ProfileDetailItem
            label="Lifetime BJJ attendance"
            value={String(attendance.lifetimeBjjCount)}
          />
          <ProfileDetailItem
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

      <section className={profileSectionClassName}>
        <ProfileSectionHeading title="Belt / Level Summary" />

        {belt.promotion?.isEligible ? (
          <div className="rounded-lg border border-dojo-red/30 bg-dojo-red/10 p-2.5">
            <p className="text-sm font-semibold leading-snug text-dojo-white">
              Consider belt promotion
            </p>
            <p className="mt-0.5 text-xs leading-snug text-dojo-muted">
              Meets attendance and time requirements for the next level.
            </p>
            <dl className={`mt-2 ${profileDetailGridClassName}`}>
              <ProfileDetailItem
                label="Current level"
                value={belt.promotion.currentBeltLabel}
              />
              <ProfileDetailItem
                label="Suggested next"
                value={belt.promotion.nextBeltLabel}
              />
            </dl>
          </div>
        ) : null}

        <dl className={profileDetailGridClassName}>
          <ProfileDetailItem label="Current belt level" value={belt.currentBeltLabel} />
          <ProfileDetailItem
            label="Awarded date"
            value={formatProfileDate(belt.currentBeltAwardedAt)}
          />
          <ProfileDetailItem
            label="Next belt level"
            value={belt.nextBeltLabel ?? "—"}
          />
          {belt.promotion && !belt.promotion.isEligible ? (
            <>
              <ProfileDetailItem
                label="Attendance since level"
                value={formatPromotionProgressLabel(
                  belt.promotion.attendanceSinceAward,
                  belt.promotion.requiredAttendance,
                )}
              />
              <ProfileDetailItem
                label="Time since level"
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
          <ActionButton href="#grading-history" label="Grading History" variant="secondary" />
        </div>
      </section>

      <section id="grading-history" className={profileSectionClassName}>
        <ProfileSectionHeading
          title="Grading History"
          description="Previous belt and stripe awards."
        />

        {gradeHistory.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-4 text-center text-sm text-dojo-muted">
            No grading history recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-1.5">Belt level</th>
                  <th className="px-3 py-1.5">Awarded</th>
                  <th className="px-3 py-1.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {gradeHistory.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-3 py-1.5 font-medium leading-snug text-dojo-white">
                      {entry.beltLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 leading-snug text-dojo-muted">
                      {formatProfileDate(entry.awardedAt)}
                    </td>
                    <td className="px-3 py-1.5 leading-snug text-dojo-muted">
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
