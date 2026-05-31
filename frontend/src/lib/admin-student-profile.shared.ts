import type { BeltPromotionAssessment } from "@/lib/admin-belt-promotion.shared";
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
  beltLabel: string;
  awardedAt: string;
  notes: string | null;
}

export interface AdminStudentPortalAccessSummary {
  portalStatusLabel: string;
  portalLoginEmail: string | null;
  inviteSentAt: string | null;
  canSetPassword: boolean;
}

export interface AdminInstructorPortalAccessSummary {
  portalStatusLabel: string;
  portalLoginEmail: string | null;
  inviteSentAt: string | null;
  canSendInvite: boolean;
  canSetPassword: boolean;
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

export interface AdminStudentProfilePageData {
  student: AdminStudentProfileDetails;
  showAdminDashboardAccess: boolean;
  portalAccess: AdminStudentPortalAccessSummary;
  instructorPortalAccess: AdminInstructorPortalAccessSummary | null;
  adminAccess: AdminDashboardAccessSummary | null;
  agreementAccess: AdminStudentAgreementAccessSummary;
  attendance: AdminStudentProfileAttendanceSummary;
  belt: AdminStudentProfileBeltSummary;
  gradeHistory: AdminStudentProfileGradeHistoryEntry[];
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
  if (!status) {
    return "—";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatProfileField(value: string | null) {
  return value?.trim() ? value : "—";
}
