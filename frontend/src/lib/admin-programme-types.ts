export const PROGRAMME_TYPES = [
  "bjj",
  "muay_thai",
  "strength_conditioning",
] as const;

export type ProgrammeType = (typeof PROGRAMME_TYPES)[number];

export const SESSION_STATUSES = ["scheduled", "cancelled", "completed"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function formatProgrammeTypeLabel(programmeType: ProgrammeType) {
  switch (programmeType) {
    case "bjj":
      return "BJJ";
    case "muay_thai":
      return "Muay Thai";
    case "strength_conditioning":
      return "Strength & Conditioning";
    default:
      return programmeType;
  }
}

export function formatSessionStatusLabel(status: string | null) {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return status ?? "Unknown";
  }
}

export function parseProgrammeType(value: string): ProgrammeType {
  if (!PROGRAMME_TYPES.includes(value as ProgrammeType)) {
    throw new Error("Programme type is invalid.");
  }

  return value as ProgrammeType;
}

export function parseSessionStatus(value: string): SessionStatus {
  if (!SESSION_STATUSES.includes(value as SessionStatus)) {
    throw new Error("Session status is invalid.");
  }

  return value as SessionStatus;
}

export function parseTimeField(value: string, label: string) {
  const trimmed = value.trim();

  if (!TIME_PATTERN.test(trimmed)) {
    throw new Error(`${label} must use HH:MM format.`);
  }

  return trimmed;
}

export function parseCapacityField(value: FormDataEntryValue | null) {
  const capacity = Number(value);

  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Capacity must be a positive whole number.");
  }

  return capacity;
}

export function parseRequiredText(value: FormDataEntryValue | null, label: string) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
}
