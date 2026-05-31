export function formatAttendanceDateKey(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Extract YYYY-MM-DD from a date or timestamptz string without timezone conversion. */
export function normalizeToDateKey(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Days in a calendar month (1–12) for the given year; handles leap-year February. */
export function getDaysInCalendarMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 0;
  }

  return new Date(year, month, 0).getDate();
}

/** Whether a day column (1–31) exists for that month in the attendance grid. */
export function isAttendanceGridDayInMonth(
  year: number,
  month: number,
  day: number,
): boolean {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return false;
  }

  return day <= getDaysInCalendarMonth(year, month);
}

export function isValidCalendarDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isFutureAttendanceDate(dateKey: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return dateKey > todayKey;
}
