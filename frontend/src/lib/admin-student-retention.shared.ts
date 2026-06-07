export type StudentRetentionRiskLevel = "low" | "medium" | "high" | "critical";

export interface StudentRetentionRiskReason {
  id: string;
  label: string;
}

export interface StudentRetentionSuggestedAction {
  id: string;
  label: string;
}

export interface StudentRetentionScoreInput {
  daysSinceLastAttendance: number | null;
  attendanceLast30Days: number;
  futureBookingsCount: number;
  membershipStatus: string | null;
  daysSinceJoined: number | null;
  daysSinceLastGrade: number | null;
  hasGradeData: boolean;
}

export interface StudentRetentionScoreResult {
  score: number;
  level: StudentRetentionRiskLevel;
  reasons: StudentRetentionRiskReason[];
  suggestedActions: StudentRetentionSuggestedAction[];
}

export interface AdminStudentRetentionRow {
  userId: string;
  fullName: string;
  beltLabel: string | null;
  profileHref: string;
  lastAttendanceDate: string | null;
  daysSinceLastAttendance: number | null;
  attendanceLast30Days: number;
  futureBookingsCount: number;
  score: number;
  level: StudentRetentionRiskLevel;
  reasons: StudentRetentionRiskReason[];
  suggestedActions: StudentRetentionSuggestedAction[];
}

const GRADE_GAP_DAYS_THRESHOLD = 180;
const NEW_STUDENT_DAYS_THRESHOLD = 90;
const LOW_ATTENDANCE_LAST_30_THRESHOLD = 2;

function capScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

export function resolveStudentRetentionRiskLevel(
  score: number,
): StudentRetentionRiskLevel {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 60) {
    return "high";
  }

  if (score >= 30) {
    return "medium";
  }

  return "low";
}

export function studentRetentionRiskLevelLabel(
  level: StudentRetentionRiskLevel,
): string {
  switch (level) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

import { isNonActiveMembershipStatus } from "@/lib/membership-status.shared";

function isNewStudentWithLowEngagement(input: StudentRetentionScoreInput) {
  if (input.daysSinceJoined === null || input.daysSinceJoined > NEW_STUDENT_DAYS_THRESHOLD) {
    return false;
  }

  const lowRecentAttendance =
    input.attendanceLast30Days < LOW_ATTENDANCE_LAST_30_THRESHOLD;
  const gapSinceAttendance =
    input.daysSinceLastAttendance === null ||
    input.daysSinceLastAttendance > 14;

  return lowRecentAttendance || gapSinceAttendance;
}

export function computeStudentRetentionScore(
  input: StudentRetentionScoreInput,
): StudentRetentionScoreResult {
  let score = 0;
  const reasons: StudentRetentionRiskReason[] = [];
  const suggestedActions: StudentRetentionSuggestedAction[] = [];
  const actionIds = new Set<string>();

  const addReason = (id: string, label: string) => {
    if (!reasons.some((reason) => reason.id === id)) {
      reasons.push({ id, label });
    }
  };

  const addAction = (id: string, label: string) => {
    if (actionIds.has(id)) {
      return;
    }

    actionIds.add(id);
    suggestedActions.push({ id, label });
  };

  const daysSince = input.daysSinceLastAttendance;

  if (daysSince !== null) {
    if (daysSince >= 30) {
      score += 50;
      addReason("absence-30", "No attendance for 30+ days");
      addAction("check-in", "Send a friendly check-in message");
      addAction("speak-in-person", "Speak to them next time they attend");
      addAction("help-book", "Offer help booking a suitable class");
    } else if (daysSince >= 21) {
      score += 35;
      addReason("absence-21", "No attendance for 21+ days");
      addAction("check-in", "Send a friendly check-in message");
      addAction("help-book", "Offer help booking a suitable class");
    } else if (daysSince >= 14) {
      score += 20;
      addReason("absence-14", "No attendance for 14+ days");
      addAction("check-in", "Send a friendly check-in message");
      addAction("help-book", "Offer help booking a suitable class");
    }
  } else if (input.attendanceLast30Days === 0) {
    addReason("no-attendance-record", "No attendance on record");
    addAction("check-in", "Send a friendly check-in message");
    addAction("help-book", "Offer help booking a suitable class");
  }

  if (input.attendanceLast30Days === 0) {
    score += 25;
    addReason("zero-30", "No attendance in the last 30 days");
    addAction("help-book", "Offer help booking a suitable class");
    addAction("speak-in-person", "Speak to them next time they attend");
  }

  if (input.futureBookingsCount === 0) {
    score += 15;
    addReason("no-bookings", "No upcoming class bookings");
    addAction("help-book", "Offer help booking a suitable class");
  }

  if (isNewStudentWithLowEngagement(input)) {
    score += 15;
    addReason("new-low", "New member with low or falling attendance");
    addAction("check-in", "Send a friendly check-in message");
    addAction("help-book", "Offer help booking a suitable class");
  }

  if (isNonActiveMembershipStatus(input.membershipStatus)) {
    score += 25;
    addReason("membership", "Membership inactive or paused");
    addAction("membership", "Check membership/payment status");
  }

  if (
    input.hasGradeData &&
    input.daysSinceLastGrade !== null &&
    input.daysSinceLastGrade >= GRADE_GAP_DAYS_THRESHOLD
  ) {
    score += 10;
    addReason("grade-gap", "Long gap since last grade or stripe");
    addAction("grading", "Review grading/progression if they appear stuck");
  }

  if (suggestedActions.length === 0) {
    addAction("maintain", "Continue regular engagement — no urgent action needed");
  }

  const capped = capScore(score);

  return {
    score: capped,
    level: resolveStudentRetentionRiskLevel(capped),
    reasons,
    suggestedActions,
  };
}

export interface StudentRetentionRiskSummary {
  totalActiveStudents: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
}

export function buildStudentRetentionRiskSummary(
  rows: AdminStudentRetentionRow[],
): StudentRetentionRiskSummary {
  let redCount = 0;
  let amberCount = 0;
  let greenCount = 0;

  for (const row of rows) {
    if (row.level === "critical" || row.level === "high") {
      redCount += 1;
    } else if (row.level === "medium") {
      amberCount += 1;
    } else {
      greenCount += 1;
    }
  }

  return {
    totalActiveStudents: rows.length,
    redCount,
    amberCount,
    greenCount,
  };
}

export function sortRetentionRowsByRiskScore(
  rows: AdminStudentRetentionRow[],
): AdminStudentRetentionRow[] {
  return [...rows].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftDays = left.daysSinceLastAttendance ?? 9999;
    const rightDays = right.daysSinceLastAttendance ?? 9999;

    if (rightDays !== leftDays) {
      return rightDays - leftDays;
    }

    return left.fullName.localeCompare(right.fullName, "en", {
      sensitivity: "base",
    });
  });
}

export function formatRetentionDateLabel(dateKey: string | null) {
  if (!dateKey) {
    return "—";
  }

  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRetentionDaysLabel(days: number | null) {
  if (days === null) {
    return "—";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}
