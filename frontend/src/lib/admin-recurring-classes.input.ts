import {
  PROGRAMME_TYPES,
  type ProgrammeType,
} from "@/lib/admin-programme-types";

export interface CreateRecurringClassInput {
  className: string;
  programmeType: ProgrammeType;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  isActive?: boolean;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseCreateRecurringClassInput(
  formData: FormData,
): CreateRecurringClassInput {
  const className = String(formData.get("className") ?? "").trim();
  const programmeType = String(formData.get("programmeType") ?? "").trim();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const capacity = Number(formData.get("capacity"));
  const location = String(formData.get("location") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!className) {
    throw new Error("Class name is required.");
  }

  if (!PROGRAMME_TYPES.includes(programmeType as ProgrammeType)) {
    throw new Error("Programme type is invalid.");
  }

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Day of week is invalid.");
  }

  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    throw new Error("Start and end times must use HH:MM format.");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Capacity must be a positive whole number.");
  }

  if (!location) {
    throw new Error("Venue/location is required.");
  }

  return {
    className,
    programmeType: programmeType as ProgrammeType,
    dayOfWeek,
    startTime,
    endTime,
    capacity,
    location,
    isActive,
  };
}
