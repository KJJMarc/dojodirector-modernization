import { clubAdminPath } from "@/lib/clubs.shared";

export const PROGRAMME_TYPE_VALUES = [
  "bjj",
  "muay_thai",
  "strength_conditioning",
  "custom",
] as const;

export type ProgrammeTypeValue = (typeof PROGRAMME_TYPE_VALUES)[number];

export interface ProgrammeFeatureSettings {
  attendanceTrackingEnabled: boolean;
  attendanceCardsEnabled: boolean;
  gradingSystemEnabled: boolean;
  beltsRanksEnabled: boolean;
  retentionTrackingEnabled: boolean;
  studentPortalAccessEnabled: boolean;
  classBookingEnabled: boolean;
  promotionCandidatesEnabled: boolean;
}

/** Which BJJ programme features to show for a student (visibility only). */
export interface StudentBjjFeatureVisibility {
  hasProgrammeAccess: boolean;
  attendanceTrackingEnabled: boolean;
  attendanceCardsEnabled: boolean;
  gradingSystemEnabled: boolean;
  beltsRanksEnabled: boolean;
  promotionCandidatesEnabled: boolean;
  showAttendanceSummary: boolean;
  showAttendanceCard: boolean;
  showBeltSummary: boolean;
  showGradingHistory: boolean;
}

export function buildStudentBjjFeatureVisibility(
  hasProgrammeAccess: boolean,
  settings: ProgrammeFeatureSettings,
): StudentBjjFeatureVisibility {
  return {
    hasProgrammeAccess,
    attendanceTrackingEnabled: settings.attendanceTrackingEnabled,
    attendanceCardsEnabled: settings.attendanceCardsEnabled,
    gradingSystemEnabled: settings.gradingSystemEnabled,
    beltsRanksEnabled: settings.beltsRanksEnabled,
    promotionCandidatesEnabled: settings.promotionCandidatesEnabled,
    showAttendanceSummary:
      hasProgrammeAccess && settings.attendanceTrackingEnabled,
    showAttendanceCard: hasProgrammeAccess && settings.attendanceCardsEnabled,
    showBeltSummary: hasProgrammeAccess && settings.beltsRanksEnabled,
    showGradingHistory: hasProgrammeAccess && settings.gradingSystemEnabled,
  };
}

export function noBjjProgrammeFeatureVisibility(): StudentBjjFeatureVisibility {
  return buildStudentBjjFeatureVisibility(
    false,
    defaultProgrammeSettingsForType("bjj"),
  );
}

export interface AdminProgramme extends ProgrammeFeatureSettings {
  id: string;
  clubId: string;
  name: string;
  slug: string;
  programmeType: ProgrammeTypeValue;
  sortOrder: number;
  isActive: boolean;
  /** When true, programme appears in Programme Management and student area navigation. */
  adminAreaEnabled: boolean;
  studentCount: number;
}

export interface ProgrammeFeatureToggleDefinition {
  key: keyof ProgrammeFeatureSettings;
  label: string;
  description: string;
}

export const PROGRAMME_FEATURE_TOGGLES: ProgrammeFeatureToggleDefinition[] = [
  {
    key: "attendanceTrackingEnabled",
    label: "Attendance Tracking",
    description: "Track attendance for classes in this programme.",
  },
  {
    key: "attendanceCardsEnabled",
    label: "Attendance Cards",
    description: "Show printable attendance cards for this programme.",
  },
  {
    key: "gradingSystemEnabled",
    label: "Grading System",
    description: "Record grades and progression history.",
  },
  {
    key: "beltsRanksEnabled",
    label: "Belts / Ranks",
    description: "Manage belt or rank levels for this programme.",
  },
  {
    key: "retentionTrackingEnabled",
    label: "Retention Tracking",
    description: "Include this programme in retention analysis.",
  },
  {
    key: "studentPortalAccessEnabled",
    label: "Student Portal Access",
    description: "Allow students to access portal features for this programme.",
  },
  {
    key: "classBookingEnabled",
    label: "Class Booking",
    description: "Allow booking classes in this programme.",
  },
  {
    key: "promotionCandidatesEnabled",
    label: "Promotion Candidates",
    description: "Show promotion candidate lists for this programme.",
  },
];

export const PROGRAMME_TYPE_OPTIONS: {
  value: ProgrammeTypeValue;
  label: string;
}[] = [
  { value: "bjj", label: "Brazilian Jiu Jitsu" },
  { value: "muay_thai", label: "Muay Thai" },
  { value: "strength_conditioning", label: "Strength & Conditioning" },
  { value: "custom", label: "Custom" },
];

/** Standard programme types available when creating a programme (custom excluded until enabled). */
export const CREATABLE_PROGRAMME_TYPE_OPTIONS = PROGRAMME_TYPE_OPTIONS.filter(
  (option): option is { value: Exclude<ProgrammeTypeValue, "custom">; label: string } =>
    option.value !== "custom",
);

/** Programme types that can be enabled as admin programme areas via Create Programme. */
export const ADMIN_CREATABLE_PROGRAMME_TYPE_OPTIONS =
  CREATABLE_PROGRAMME_TYPE_OPTIONS.filter(
    (option) => option.value !== "strength_conditioning",
  );

export type CreatableProgrammeTypeValue =
  (typeof CREATABLE_PROGRAMME_TYPE_OPTIONS)[number]["value"];

/** Programme types managed as unified programme access (membership + portal booking). */
export const STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES = [
  "bjj",
  "muay_thai",
  "strength_conditioning",
] as const satisfies readonly ProgrammeTypeValue[];

export type StudentPortalAccessProgrammeType =
  (typeof STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES)[number];

export const BJJ_PROGRAMME_SLUG = "bjj";

export const LEGACY_BJJ_PROGRAMME_ID = "legacy-bjj-programme";

export const PROGRAMMES_MIGRATION_PATH =
  "supabase/migrations/20260601120000_programmes_architecture.sql";

export const PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE =
  "Programme Management is not yet enabled on this database.";

export function formatProgrammeTypeOptionLabel(programmeType: ProgrammeTypeValue) {
  return (
    PROGRAMME_TYPE_OPTIONS.find((option) => option.value === programmeType)?.label ??
    programmeType
  );
}

export function formatProgrammeStudentsLabel(programme: Pick<AdminProgramme, "name">) {
  return `${programme.name} Students`;
}

export function parseProgrammeTypeValue(value: string): ProgrammeTypeValue {
  if (!PROGRAMME_TYPE_VALUES.includes(value as ProgrammeTypeValue)) {
    throw new Error("Programme type is invalid.");
  }

  return value as ProgrammeTypeValue;
}

export function parseCreatableProgrammeTypeValue(
  value: string,
): CreatableProgrammeTypeValue {
  const programmeType = parseProgrammeTypeValue(value);

  if (programmeType === "custom") {
    throw new Error("Custom programmes are not available yet.");
  }

  return programmeType;
}

export function programmeNameForType(programmeType: ProgrammeTypeValue): string {
  return formatProgrammeTypeOptionLabel(programmeType);
}

export function programmeSlugForType(programmeType: ProgrammeTypeValue): string {
  switch (programmeType) {
    case "bjj":
      return BJJ_PROGRAMME_SLUG;
    case "muay_thai":
      return "muay-thai";
    case "strength_conditioning":
      return "strength-conditioning";
    default:
      return slugifyProgrammeName(programmeNameForType(programmeType));
  }
}

export function slugifyProgrammeName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "programme";
}

export function defaultProgrammeSettingsForType(
  programmeType: ProgrammeTypeValue,
): ProgrammeFeatureSettings {
  switch (programmeType) {
    case "bjj":
      return {
        attendanceTrackingEnabled: true,
        attendanceCardsEnabled: true,
        gradingSystemEnabled: true,
        beltsRanksEnabled: true,
        retentionTrackingEnabled: true,
        studentPortalAccessEnabled: true,
        classBookingEnabled: true,
        promotionCandidatesEnabled: true,
      };
    case "muay_thai":
    case "strength_conditioning":
      return {
        attendanceTrackingEnabled: true,
        attendanceCardsEnabled: false,
        gradingSystemEnabled: false,
        beltsRanksEnabled: false,
        retentionTrackingEnabled: true,
        studentPortalAccessEnabled: true,
        classBookingEnabled: true,
        promotionCandidatesEnabled: false,
      };
    case "custom":
    default:
      return {
        attendanceTrackingEnabled: true,
        attendanceCardsEnabled: false,
        gradingSystemEnabled: false,
        beltsRanksEnabled: false,
        retentionTrackingEnabled: false,
        studentPortalAccessEnabled: false,
        classBookingEnabled: true,
        promotionCandidatesEnabled: false,
      };
  }
}

export function clubProgrammesAdminPath(clubSlug: string, section?: string) {
  return clubAdminPath(clubSlug, section ? `programmes/${section}` : "programmes");
}

export function clubProgrammeAdminPath(
  clubSlug: string,
  programmeSlug: string,
  section?: string,
) {
  const base = `programmes/${programmeSlug}`;
  return clubAdminPath(clubSlug, section ? `${base}/${section}` : base);
}

export function clubBjjStudentsAdminPath(clubSlug: string, section?: string) {
  return clubAdminPath(clubSlug, section ? `students/${section}` : "students");
}

export function clubProgrammeStudentAreasPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "students/programmes");
}

export function programmeStudentsAdminPath(
  clubSlug: string,
  programmeSlug: string,
) {
  if (programmeSlug === BJJ_PROGRAMME_SLUG) {
    return clubBjjStudentsAdminPath(clubSlug);
  }

  return clubProgrammeAdminPath(clubSlug, programmeSlug, "students");
}

export function programmeStudentsNewAdminPath(
  clubSlug: string,
  programmeSlug: string,
) {
  if (programmeSlug === BJJ_PROGRAMME_SLUG) {
    return clubBjjStudentsAdminPath(clubSlug, "new");
  }

  return clubProgrammeAdminPath(clubSlug, programmeSlug, "students/new");
}

export interface AddStudentProgrammeAccessOption {
  programmeType: StudentPortalAccessProgrammeType;
  label: string;
  defaultChecked: boolean;
}

function normalizePortalAccessSourceProgrammeType(
  sourceProgrammeType: ProgrammeTypeValue,
): StudentPortalAccessProgrammeType {
  if (
    STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.includes(
      sourceProgrammeType as StudentPortalAccessProgrammeType,
    )
  ) {
    return sourceProgrammeType as StudentPortalAccessProgrammeType;
  }

  return "bjj";
}

export function programmeStudentAreaLabel(
  programmeType: StudentPortalAccessProgrammeType,
): string {
  return `${formatProgrammeTypeOptionLabel(programmeType)} Student`;
}

export function programmeBookingAccessLabel(
  programmeType: StudentPortalAccessProgrammeType,
): string {
  return `${formatProgrammeTypeOptionLabel(programmeType)} Classes`;
}

export function buildAddStudentProgrammeMembershipOptions(
  sourceProgrammeType: ProgrammeTypeValue,
): AddStudentProgrammeAccessOption[] {
  const source = normalizePortalAccessSourceProgrammeType(sourceProgrammeType);

  return STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.map((programmeType) => ({
    programmeType,
    label: programmeStudentAreaLabel(programmeType),
    defaultChecked: programmeType === source,
  }));
}

export function buildAddStudentBookingAccessOptions(
  sourceProgrammeType: ProgrammeTypeValue,
): AddStudentProgrammeAccessOption[] {
  const source = normalizePortalAccessSourceProgrammeType(sourceProgrammeType);

  return STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.map((programmeType) => ({
    programmeType,
    label: programmeBookingAccessLabel(programmeType),
    defaultChecked:
      source === "bjj"
        ? true
        : programmeType === source,
  }));
}

/** @deprecated Use buildAddStudentProgrammeMembershipOptions */
export function buildAddStudentProgrammeAccessOptions(
  sourceProgrammeType: ProgrammeTypeValue,
): AddStudentProgrammeAccessOption[] {
  return buildAddStudentProgrammeMembershipOptions(sourceProgrammeType);
}

function parsePortalAccessProgrammeTypes(
  values: string[],
): StudentPortalAccessProgrammeType[] {
  const allowed = new Set<string>(STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES);
  const selected = new Set<StudentPortalAccessProgrammeType>();

  for (const value of values) {
    if (allowed.has(value)) {
      selected.add(value as StudentPortalAccessProgrammeType);
    }
  }

  return STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.filter((programmeType) =>
    selected.has(programmeType),
  );
}

export function parseProgrammeMembershipTypes(
  values: string[],
): StudentPortalAccessProgrammeType[] {
  return parsePortalAccessProgrammeTypes(values);
}

export function parseBookingAccessProgrammeTypes(
  values: string[],
): StudentPortalAccessProgrammeType[] {
  return parsePortalAccessProgrammeTypes(values);
}

/** @deprecated Use parseBookingAccessProgrammeTypes */
export const parseProgrammeAccessTypes = parseBookingAccessProgrammeTypes;

export function parseProgrammeFeatureSettings(
  formData: FormData,
): ProgrammeFeatureSettings {
  return {
    attendanceTrackingEnabled: formData.get("attendanceTrackingEnabled") === "on",
    attendanceCardsEnabled: formData.get("attendanceCardsEnabled") === "on",
    gradingSystemEnabled: formData.get("gradingSystemEnabled") === "on",
    beltsRanksEnabled: formData.get("beltsRanksEnabled") === "on",
    retentionTrackingEnabled: formData.get("retentionTrackingEnabled") === "on",
    studentPortalAccessEnabled: formData.get("studentPortalAccessEnabled") === "on",
    classBookingEnabled: formData.get("classBookingEnabled") === "on",
    promotionCandidatesEnabled: formData.get("promotionCandidatesEnabled") === "on",
  };
}
