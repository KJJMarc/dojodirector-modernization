export interface AdultBeltRequirementRow {
  id: string;
  targetBeltLabel: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredMonths: number;
}

export interface JuniorBeltRequirementRow {
  id: string;
  fromBeltLabel: string;
  toBeltLabel: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredWeeks: number;
}

export interface BeltManagementPageData {
  adultRequirements: AdultBeltRequirementRow[];
  juniorRequirements: JuniorBeltRequirementRow[];
}

export function parsePositiveIntegerField(raw: string, fieldLabel: string): number {
  const trimmed = raw.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldLabel} must be a positive integer.`);
  }

  const value = Number.parseInt(trimmed, 10);

  if (value <= 0) {
    throw new Error(`${fieldLabel} must be a positive integer.`);
  }

  return value;
}
