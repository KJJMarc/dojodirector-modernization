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
