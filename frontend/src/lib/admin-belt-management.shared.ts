export interface AdultBeltRequirementRow {
  id: string;
  beltLevelId?: string;
  targetBeltLabel: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredMonths: number;
  colour?: string | null;
  isActive?: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
}

export interface JuniorBeltRequirementRow {
  id: string;
  beltLevelId?: string;
  targetBeltLabel: string;
  fromBeltLabel?: string;
  toBeltLabel?: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredWeeks: number;
  colour?: string | null;
  isActive?: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
}

export interface BeltManagementPageData {
  beltSystems?: import("@/lib/admin-belt-systems.shared").AdminBeltSystem[];
  adultRequirements: AdultBeltRequirementRow[];
  juniorRequirements: JuniorBeltRequirementRow[];
}

export {
  parsePositiveIntegerField,
  parseNonNegativeIntegerField,
} from "@/lib/admin-belt-systems.shared";
