import Link from "next/link";
import { LoginAccessPanel } from "@/components/admin/login-access-panel";
import { PortalSetupPanel } from "@/components/admin/portal-setup-panel";
import { ProfileAccessAgreementsPanel } from "@/components/admin/profile-access-agreements-panel";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import { StudentProfileMembershipManager } from "@/components/admin/student-profile-membership-manager";
import { StudentProgrammeAccessPanel } from "@/components/admin/student-programme-access-panel";
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

export function StudentProfileView({
  clubSlug,
  pageData,
}: StudentProfileViewProps) {
  const {
    student,
    leadSource,
    loginAccess,
    portalSetup,
    portalAccess,
    instructorPortalAccess,
    showAdminDashboardAccess,
    adminAccess,
    agreementAccess,
    programmeMembership,
    programmeBookingAccess,
    bjjFeatureVisibility,
    attendance,
    belt,
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
          <ProfileDetailItem
            label="Membership role"
            value={student.role ?? "—"}
          />
          <ProfileDetailItem
            label="Membership status"
            value={formatMembershipStatus(student.membershipStatus)}
          />
          <div className="sm:col-span-2">
            <ProfileDetailItem label="Address" value={formatProfileField(student.address)} />
          </div>
          {student.adminNotes ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
                Admin notes
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-dojo-white">
                {student.adminNotes}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className={profileSectionClassName}>
        <ProfileSectionHeading title="Lead Source" />
        <p className="mb-2 text-xs text-dojo-muted">
          Original enquiry source preserved when this student was converted from a lead.
        </p>
        <dl className={profileDetailGridClassName}>
          <ProfileDetailItem
            label="Original lead source"
            value={formatProfileField(leadSource.sourceLabel)}
          />
        </dl>
      </section>

      <StudentProfileMembershipManager
        clubSlug={clubSlug}
        student={student}
        kidsToAdultMigration={pageData.kidsToAdultMigration}
      />

      <StudentProgrammeAccessPanel
        clubSlug={clubSlug}
        userId={student.id}
        programmeMembership={programmeMembership}
        programmeBookingAccess={programmeBookingAccess}
      />

      <LoginAccessPanel
        clubSlug={clubSlug}
        userId={student.id}
        loginAccess={loginAccess}
        canSendPortalInvite={portalAccess.canSendInvite}
        portalInviteSentAt={portalAccess.inviteSentAt}
      />

      <PortalSetupPanel
        clubSlug={clubSlug}
        userId={student.id}
        portalSetup={portalSetup}
      />

      <ProfileAccessAgreementsPanel
        clubSlug={clubSlug}
        studentUserId={student.id}
        membershipRole={student.membershipRole}
        portalAccess={portalAccess}
        agreementAccess={agreementAccess}
        instructorPortalAccess={instructorPortalAccess}
        showAdminDashboardAccess={showAdminDashboardAccess}
        adminAccess={adminAccess}
      />

      {bjjFeatureVisibility.showAttendanceSummary ? (
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

          {bjjFeatureVisibility.showAttendanceCard ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                href={`/students/${student.id}/attendance-card?year=${ATTENDANCE_CARD_YEAR}&clubSlug=${encodeURIComponent(clubSlug)}`}
                label="Attendance Card"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {bjjFeatureVisibility.showBeltSummary ? (
      <section className={profileSectionClassName}>
        <ProfileSectionHeading title="Belt / Level Summary" />

        {belt.promotion?.isEligible &&
        bjjFeatureVisibility.promotionCandidatesEnabled ? (
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
          {belt.promotion &&
          !belt.promotion.isEligible &&
          bjjFeatureVisibility.promotionCandidatesEnabled ? (
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
          {bjjFeatureVisibility.gradingSystemEnabled ? (
            <ActionButton
              href={clubAdminPath(clubSlug, `students/${student.id}/change-belt`)}
              label="Change Belt Level"
            />
          ) : null}
          {bjjFeatureVisibility.showGradingHistory ? (
            <ActionButton
              href={clubAdminPath(
                clubSlug,
                `students/${student.id}/grading-history`,
              )}
              label="Grading History"
              variant="secondary"
            />
          ) : null}
        </div>
      </section>
      ) : null}
    </div>
  );
}
