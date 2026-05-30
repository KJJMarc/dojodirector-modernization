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
  membershipStatus: string | null;
}

export interface AdminStudentProfileAttendanceSummary {
  lifetimeBjjCount: number;
  lastAttendanceDate: string | null;
}

export interface AdminStudentProfileBeltSummary {
  currentBeltLabel: string;
  currentBeltAwardedAt: string | null;
  nextBeltLabel: string | null;
}

export interface AdminStudentProfileGradeHistoryEntry {
  id: string;
  beltLabel: string;
  awardedAt: string;
  notes: string | null;
}

export interface AdminStudentProfilePageData {
  student: AdminStudentProfileDetails;
  attendance: AdminStudentProfileAttendanceSummary;
  belt: AdminStudentProfileBeltSummary;
  gradeHistory: AdminStudentProfileGradeHistoryEntry[];
}

export function formatProfileDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(`${value}T12:00:00`);

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
