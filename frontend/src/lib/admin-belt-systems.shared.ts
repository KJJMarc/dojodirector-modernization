import { clubAdminPath } from "@/lib/clubs.shared";

export const BELT_TIME_UNITS = ["weeks", "months", "years"] as const;

export type BeltTimeUnit = (typeof BELT_TIME_UNITS)[number];

export const LEGACY_BELT_SYSTEM_ADULT_ID = "legacy-belt-system-adult";
export const LEGACY_BELT_SYSTEM_JUNIOR_ID = "legacy-belt-system-junior";

export interface BeltSystemLevelRow {
  beltLevelId: string;
  requirementId: string;
  name: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredTimeValue: number;
  requiredTimeUnit: BeltTimeUnit;
  nextBeltLabel: string | null;
  colour: string | null;
  isActive: boolean;
  canDelete: boolean;
  deleteBlockedReason: string | null;
}

export interface BeltLevelEditPageData {
  beltLevelId: string;
  requirementId: string;
  beltSystemId: string;
  beltSystemName: string;
  legacyCategory: "adult" | "junior" | null;
  name: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredTimeValue: number;
  requiredTimeUnit: BeltTimeUnit;
  colour: string | null;
  isActive: boolean;
  nextBeltLabel: string | null;
  canDelete: boolean;
  deleteBlockedReason: string | null;
}

export interface AdminBeltSystem {
  id: string;
  clubId: string;
  name: string;
  slug: string;
  description: string | null;
  programmeId: string | null;
  defaultTimeUnit: BeltTimeUnit;
  legacyCategory: "adult" | "junior" | null;
  sortOrder: number;
  isActive: boolean;
  levels: BeltSystemLevelRow[];
}

export interface BeltSystemManagerPageData {
  systems: AdminBeltSystem[];
}

export function parseBeltTimeUnit(value: string): BeltTimeUnit {
  if (!BELT_TIME_UNITS.includes(value as BeltTimeUnit)) {
    throw new Error("Required time unit must be weeks, months, or years.");
  }

  return value as BeltTimeUnit;
}

export function parseNonNegativeIntegerField(
  raw: string,
  fieldLabel: string,
): number {
  const trimmed = raw.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldLabel} must be a whole number.`);
  }

  return Number.parseInt(trimmed, 10);
}

export function parsePositiveIntegerField(raw: string, fieldLabel: string): number {
  const value = parseNonNegativeIntegerField(raw, fieldLabel);

  if (value <= 0) {
    throw new Error(`${fieldLabel} must be a positive integer.`);
  }

  return value;
}

export function slugifyBeltSystemName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "belt-system";
}

export function formatBeltTimeLabel(value: number, unit: BeltTimeUnit) {
  const unitLabel = value === 1 ? unit.slice(0, -1) : unit;
  return `${value} ${unitLabel}`;
}

export const BELT_DELETE_BLOCKED_MESSAGE =
  "This belt is used in grading history and cannot be deleted. Mark it inactive instead.";

export function clubBeltManagementAdminPath(clubSlug: string, beltLevelId?: string) {
  return clubAdminPath(
    clubSlug,
    beltLevelId ? `belt-management/${beltLevelId}` : "belt-management",
  );
}
