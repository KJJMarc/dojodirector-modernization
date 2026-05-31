/** Sources for attendance marked on the BJJ student attendance card (not session register). */
export const BJJ_ATTENDANCE_CARD_MANUAL_SOURCES = [
  "manual_attendance_card",
  "manual",
] as const;

export type BjjAttendanceCardManualSource =
  (typeof BJJ_ATTENDANCE_CARD_MANUAL_SOURCES)[number];

export const BJJ_ATTENDANCE_CARD_MANUAL_SOURCE: BjjAttendanceCardManualSource =
  "manual_attendance_card";

export function isBjjAttendanceCardManualSource(
  source: string | null | undefined,
): boolean {
  if (!source) {
    return false;
  }

  return (BJJ_ATTENDANCE_CARD_MANUAL_SOURCES as readonly string[]).includes(
    source,
  );
}
