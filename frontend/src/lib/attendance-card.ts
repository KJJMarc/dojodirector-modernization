import { getStudentFullName } from "@/lib/attendance";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  AttendanceRecord,
  BeltLevel,
  GradeAward,
  UserProfile,
} from "@/types/database";

export type GridCell = "" | "X" | "G";

export interface YearlyGridRow {
  month: number;
  monthLabel: string;
  days: GridCell[];
}

export interface StudentAttendanceCardData {
  student: UserProfile;
  studentName: string;
  beltLabel: string | null;
  year: number;
  rows: YearlyGridRow[];
  totalAttendance: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function getBeltLevel(
  beltLevels: GradeAward["belt_levels"],
): BeltLevel | null {
  if (!beltLevels) {
    return null;
  }
  return Array.isArray(beltLevels) ? beltLevels[0] ?? null : beltLevels;
}

export function formatBeltLabel(belt: BeltLevel | null): string | null {
  if (!belt) {
    return null;
  }

  const stripeSuffix =
    belt.stripe_count && belt.stripe_count > 0
      ? ` (${belt.stripe_count} stripe${belt.stripe_count === 1 ? "" : "s"})`
      : "";

  return `${belt.name}${stripeSuffix}`;
}

export function parseYearParam(value: string | undefined): number {
  const parsed = Number(value);
  const currentYear = new Date().getFullYear();

  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > currentYear + 1) {
    return currentYear;
  }

  return parsed;
}

export function buildYearlyGrid(
  attendances: Pick<AttendanceRecord, "attended_on">[],
  gradeAwards: Pick<GradeAward, "awarded_at">[],
  year: number,
): { rows: YearlyGridRow[]; totalAttendance: number } {
  const attendedDays = new Set<string>();
  const gradingDays = new Set<string>();

  for (const record of attendances) {
    attendedDays.add(record.attended_on);
  }

  for (const award of gradeAwards) {
    gradingDays.add(award.awarded_at);
  }

  const rows: YearlyGridRow[] = MONTH_LABELS.map((monthLabel, index) => {
    const month = index + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: GridCell[] = [];

    for (let day = 1; day <= 31; day += 1) {
      if (day > daysInMonth) {
        days.push("");
        continue;
      }

      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (gradingDays.has(dateKey)) {
        days.push("G");
      } else if (attendedDays.has(dateKey)) {
        days.push("X");
      } else {
        days.push("");
      }
    }

    return { month, monthLabel, days };
  });

  return {
    rows,
    totalAttendance: attendedDays.size,
  };
}

async function getStudentProfile(userId: string): Promise<UserProfile> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as UserProfile;
}

async function getAttendanceRecordsForYear(userId: string, year: number) {
  const supabase = getSupabaseServerClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "id, user_id, attended_on, class_session_id, class_sessions(class_id, classes(programme_type))",
    )
    .eq("user_id", userId)
    .eq("club_id", ACTIVE_CLUB_ID)
    .gte("attended_on", startDate)
    .lte("attended_on", endDate);

  if (error) {
    throw new Error(`Failed to load attendance records: ${error.message}`);
  }

  return ((data ?? []) as Array<
    AttendanceRecord & {
      class_session_id: string | null;
      class_sessions:
        | {
            class_id: string;
            classes: { programme_type: string } | { programme_type: string }[] | null;
          }
        | {
            class_id: string;
            classes: { programme_type: string } | { programme_type: string }[] | null;
          }[]
        | null;
    }
  >)
    .filter((record) => isBjjAttendanceRecord(record))
    .map(({ id, user_id, attended_on }) => ({ id, user_id, attended_on }));
}

function getProgrammeTypeFromJoinedSession(
  classSessions: {
    classes: { programme_type: string } | { programme_type: string }[] | null;
  } | {
    classes: { programme_type: string } | { programme_type: string }[] | null;
  }[] | null,
) {
  if (!classSessions) {
    return null;
  }

  const session = Array.isArray(classSessions) ? classSessions[0] ?? null : classSessions;
  const classes = session?.classes;

  if (!classes) {
    return null;
  }

  const classRow = Array.isArray(classes) ? classes[0] ?? null : classes;
  return classRow?.programme_type ?? null;
}

function isBjjAttendanceRecord(record: {
  class_session_id: string | null;
  class_sessions:
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }[]
    | null;
}) {
  if (!record.class_session_id) {
    return true;
  }

  return getProgrammeTypeFromJoinedSession(record.class_sessions) === "bjj";
}

function isGradeAwardsPermissionDenied(error: { message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("permission denied") && message.includes("grade_awards")
  );
}

async function getGradeAwardsForYear(userId: string, year: number) {
  const supabase = getSupabaseServerClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, user_id, awarded_at, belt_levels(id, name, colour, stripe_count)")
    .eq("user_id", userId)
    .gte("awarded_at", startDate)
    .lte("awarded_at", endDate);

  if (error) {
    if (isGradeAwardsPermissionDenied(error)) {
      return [] as GradeAward[];
    }
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return (data ?? []) as GradeAward[];
}

async function getBeltAtEndOfYear(userId: string, year: number) {
  const supabase = getSupabaseServerClient();
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, awarded_at, belt_levels(id, name, colour, stripe_count)")
    .eq("user_id", userId)
    .lte("awarded_at", endDate)
    .order("awarded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isGradeAwardsPermissionDenied(error)) {
      return null;
    }
    throw new Error(`Failed to load belt rank: ${error.message}`);
  }

  return data as GradeAward | null;
}

export async function getStudentAttendanceCardData(
  userId: string,
  year: number,
): Promise<StudentAttendanceCardData> {
  const [student, attendances, gradeAwards, beltAtYearEnd] = await Promise.all([
    getStudentProfile(userId),
    getAttendanceRecordsForYear(userId, year),
    getGradeAwardsForYear(userId, year),
    getBeltAtEndOfYear(userId, year),
  ]);

  const { rows, totalAttendance } = buildYearlyGrid(
    attendances,
    gradeAwards,
    year,
  );

  return {
    student,
    studentName: getStudentFullName(student.first_name, student.last_name),
    beltLabel: formatBeltLabel(getBeltLevel(beltAtYearEnd?.belt_levels ?? null)),
    year,
    rows,
    totalAttendance,
  };
}
