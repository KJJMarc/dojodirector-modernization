import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import {
  AttendanceRecord,
  BeltLevel,
  UserProfile,
} from "@/types/database";

export type GridCell = "" | "X" | "G";

export interface YearlyGridRow {
  month: number;
  monthLabel: string;
  days: GridCell[];
}

export interface AttendanceCardHeaderStats {
  lifetimeBjjAttendanceCount: number;
  lastAttendanceDate: string | null;
}

export interface StudentAttendanceCardData {
  student: UserProfile;
  studentName: string;
  beltLabel: string | null;
  year: number;
  rows: YearlyGridRow[];
  totalAttendance: number;
  headerStats: AttendanceCardHeaderStats;
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

export function formatBeltLabel(belt: BeltLevel | null): string | null {
  return formatAttendanceCardRankLabel(belt?.name ?? null);
}

/** Belt name for the card header — strips redundant "(N stripes)" suffixes. */
export function formatAttendanceCardRankLabel(label: string | null | undefined) {
  if (!label?.trim()) {
    return null;
  }

  return label.trim().replace(/\s*\(\d+\s+stripes?\)\s*$/i, "");
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
  gradeAwards: Array<{ awarded_at: string }>,
  year: number,
): { rows: YearlyGridRow[]; totalAttendance: number } {
  const attendedDays = new Set<string>();
  const gradingDays = new Set<string>();

  for (const record of attendances) {
    const attendedOn = normalizeToDateKey(record.attended_on);

    if (attendedOn) {
      attendedDays.add(attendedOn);
    }
  }

  for (const award of gradeAwards) {
    const awardedOn = normalizeToDateKey(award.awarded_at);

    if (awardedOn) {
      gradingDays.add(awardedOn);
    }
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
