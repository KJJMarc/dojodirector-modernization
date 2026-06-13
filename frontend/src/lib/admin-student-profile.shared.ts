import type { BeltPromotionAssessment } from "@/lib/admin-belt-promotion.shared";
import { formatMembershipStatusLabel } from "@/lib/membership-status.shared";
import type { KidsToAdultMigrationEligibility } from "@/lib/admin-migrate-kids-to-adult.shared";
import type { StudentBjjFeatureVisibility } from "@/lib/admin-programmes.shared";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import type { SignatoryType } from "@/lib/student-portal-agreements.shared";

export interface AdminStudentProfileDetails {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  role: string | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  canChangeRole: boolean;
  canDelete: boolean;
  lastSuperAdminWarning: string | null;
}

export interface AdminStudentProfileAttendanceSummary {
  lifetimeBjjCount: number;
  lastAttendanceDate: string | null;
}

export interface AdminStudentProfileBeltSummary {
  currentBeltLabel: string;
  currentBeltAwardedAt: string | null;
  nextBeltLabel: string | null;
  promotion: BeltPromotionAssessment | null;
}

export interface AdminStudentProfileGradeHistoryEntry {
  id: string;
  beltLevelId: string | null;
  beltLabel: string;
  awardedAt: string;
  notes: string | null;
}

export interface AdminStudentPortalAccessSummary {
  portalStatusLabel: string;
  portalLoginEmail: string | null;
  inviteSentAt: string | null;
  canSetPassword: boolean;
  canSendInvite: boolean;
  inviteUnavailableReason: string | null;
}

export interface AdminInstructorPortalAccessSummary {
  portalStatusLabel: string;
  portalLoginLabel: string;
  portalLoginEmail: string | null;
  inviteSentAt: string | null;
  canSendInvite: boolean;
  canSetPassword: boolean;
  canSignInToInstructorPortal: boolean;
}

export interface AdminStudentAgreementAccessSummary {
  agreementLabel: string;
  agreementVersionLabel: string;
  statusLabel: string;
  isComplete: boolean;
  version: string;
  acceptedAt: string | null;
  signedFullName: string | null;
  hasAgreementPdf: boolean;
  signatoryType: SignatoryType | null;
  signatoryTypeLabel: string | null;
  participantName: string | null;
  relationshipToParticipant: string | null;
}

export interface AdminDashboardAccessSummary {
  loginEmail: string | null;
  hasAuthLogin: boolean;
  canSetPassword: boolean;
  canChangePassword: boolean;
  canClearAccess: boolean;
  isPlatformSuperAdmin: boolean;
  isClubAdmin: boolean;
  showPanel: boolean;
}

export interface ProfileLoginAccessSummary {
  loginEmail: string | null;
  canSetPassword: boolean;
  hasAuthLogin: boolean;
  loginStatusLabel: string;
  authLinkedLabel: string;
  portalAuthStatusLabel: string;
}

export interface PortalSetupAccessSummary {
  statusLabel: string;
  sentAtLabel: string | null;
  canSendSetupEmail: boolean;
  setupEmailUnavailableReason: string | null;
}

export interface AdminStudentProgrammeAccessItem {
  programmeId: string;
  name: string;
  hasAccess: boolean;
}

export interface AdminStudentProgrammeAccessSummary {
  available: boolean;
  programmes: AdminStudentProgrammeAccessItem[];
}

/** @deprecated Use AdminStudentProgrammeMembershipSummary for student areas */
export type AdminStudentProgrammeBookingAccessSummary = AdminStudentProgrammeAccessSummary;

export interface AdminStudentProgrammeMembershipItem {
  programmeId: string;
  name: string;
  programmeType: string;
  isMember: boolean;
}

export interface AdminStudentProgrammeMembershipSummary {
  available: boolean;
  programmes: AdminStudentProgrammeMembershipItem[];
}

export interface AdminStudentProfileLeadSourceSummary {
  sourceLabel: string | null;
}

export interface AdminStudentProfilePageData {
  kidsToAdultMigration: KidsToAdultMigrationEligibility;
  student: AdminStudentProfileDetails;
  leadSource: AdminStudentProfileLeadSourceSummary;
  loginAccess: ProfileLoginAccessSummary;
  portalSetup: PortalSetupAccessSummary;
  showAdminDashboardAccess: boolean;
  portalAccess: AdminStudentPortalAccessSummary;
  instructorPortalAccess: AdminInstructorPortalAccessSummary | null;
  adminAccess: AdminDashboardAccessSummary | null;
  agreementAccess: AdminStudentAgreementAccessSummary;
  programmeMembership: AdminStudentProgrammeMembershipSummary;
  programmeBookingAccess: AdminStudentProgrammeAccessSummary;
  bjjFeatureVisibility: StudentBjjFeatureVisibility;
  attendance: AdminStudentProfileAttendanceSummary;
  belt: AdminStudentProfileBeltSummary;
}

export function formatProfileDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const dateKey = normalizeToDateKey(value);

  if (!dateKey) {
    return value;
  }

  const parsed = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatMembershipStatus(status: string | null) {
  return formatMembershipStatusLabel(status);
}

export function formatProfileField(value: string | null) {
  return value?.trim() ? value : "—";
}

/** Prefix(es) written by legacy import scripts into grade_awards.notes for audit — hidden in UI. */
const LEGACY_GRADE_AWARD_IMPORT_NOTE_PREFIX = "legacy_import";
const KIDS_ADULT_MIGRATION_NOTE_PREFIX = "kids_adult_migration";

function isHiddenGradeAwardSystemNote(notes: string): boolean {
  return (
    notes === LEGACY_GRADE_AWARD_IMPORT_NOTE_PREFIX ||
    notes.startsWith(`${LEGACY_GRADE_AWARD_IMPORT_NOTE_PREFIX}:`) ||
    notes === KIDS_ADULT_MIGRATION_NOTE_PREFIX ||
    notes.startsWith(`${KIDS_ADULT_MIGRATION_NOTE_PREFIX}:`)
  );
}

/** User-facing notes for grading history; import metadata stays in the database. */
export function formatGradeAwardNotesForDisplay(
  notes: string | null | undefined,
): string | null {
  const displayLines = (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isHiddenGradeAwardSystemNote(line));

  if (displayLines.length === 0) {
    return null;
  }

  return displayLines.join("\n");
}
