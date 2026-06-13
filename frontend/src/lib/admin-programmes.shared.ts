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

export interface AdminAreaProgrammeClassScope {
  programmeIds: string[];
  programmeTypes: string[];
}

export function buildAdminAreaProgrammeClassScope(
  programmes: ReadonlyArray<{ id: string; programmeType: string }>,
): AdminAreaProgrammeClassScope {
  const programmeIds: string[] = [];
  const programmeTypes = new Set<string>();

  for (const programme of programmes) {
    if (programme.id !== LEGACY_BJJ_PROGRAMME_ID) {
      programmeIds.push(programme.id);
    }

    programmeTypes.add(programme.programmeType);
  }

  return {
    programmeIds,
    programmeTypes: Array.from(programmeTypes),
  };
}

export function classBelongsToAdminAreaProgrammeScope(
  classRow: { programme_id?: string | null; programme_type?: string | null },
  scope: AdminAreaProgrammeClassScope,
): boolean {
  const programmeId = classRow.programme_id?.trim();

  if (programmeId && scope.programmeIds.includes(programmeId)) {
    return true;
  }

  const programmeType = classRow.programme_type?.trim();

  if (!programmeId && programmeType && scope.programmeTypes.includes(programmeType)) {
    return true;
  }

  return false;
}

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

/** Query param preserving which programme student list opened the profile. */
export const STUDENT_PROFILE_FROM_PROGRAMME_PARAM = "fromProgramme";

export function formatStudentProfileBackLabel(programmeName: string) {
  return `← Back to ${formatProgrammeStudentsLabel({ name: programmeName })}`;
}

export function buildStudentProfileAdminPath(
  clubSlug: string,
  userId: string,
  options?: { programmeSlug?: string | null },
) {
  const path = clubAdminPath(clubSlug, `students/${userId}/profile`);
  const programmeSlug = options?.programmeSlug?.trim();

  if (!programmeSlug) {
    return path;
  }

  const params = new URLSearchParams();
  params.set(STUDENT_PROFILE_FROM_PROGRAMME_PARAM, programmeSlug);
  return `${path}?${params.toString()}`;
}

export interface AddStudentProgrammeAccessOption {
  programmeType: StudentPortalAccessProgrammeType;
  label: string;
  defaultChecked: boolean;
}

/** Programme row from public.programmes used to build Add Student access options. */
export interface AddStudentProgrammeRow {
  id: string;
  name: string;
  slug: string;
  programmeType: StudentPortalAccessProgrammeType;
}

export function isStudentPortalAccessProgrammeType(
  value: string,
): value is StudentPortalAccessProgrammeType {
  return (STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES as readonly string[]).includes(value);
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

/** Inputs for filtering which portal-access programmes appear on student access forms. */
export interface StudentAccessFormProgrammeCandidate {
  programmeType: StudentPortalAccessProgrammeType;
  studentPortalAccessEnabled: boolean;
  adminAreaEnabled: boolean;
  hasClasses: boolean;
  createdAtMs: number;
}

/** Programmes inserted together share nearly identical created_at timestamps. */
const STUDENT_ACCESS_FORM_BATCH_INSERT_SPREAD_MS = 1_000;

/**
 * Programmes shown on Add Student and profile access panels.
 * Batch-provisioned clubs keep every portal-access programme; otherwise only
 * admin-area programmes and programmes with classes are shown.
 */
export function filterProgrammesForStudentAccessForms(
  programmes: readonly StudentAccessFormProgrammeCandidate[],
): StudentPortalAccessProgrammeType[] {
  const portalProgrammes = programmes.filter(
    (programme) => programme.studentPortalAccessEnabled,
  );

  if (portalProgrammes.length === 0) {
    return [];
  }

  const createdAtTimes = portalProgrammes.map((programme) => programme.createdAtMs);
  const createdAtSpread =
    Math.max(...createdAtTimes) - Math.min(...createdAtTimes);

  if (
    portalProgrammes.length >= 2 &&
    createdAtSpread <= STUDENT_ACCESS_FORM_BATCH_INSERT_SPREAD_MS
  ) {
    return portalProgrammes.map((programme) => programme.programmeType);
  }

  return portalProgrammes
    .filter(
      (programme) => programme.adminAreaEnabled || programme.hasClasses,
    )
    .map((programme) => programme.programmeType);
}

export function buildAddStudentProgrammeMembershipOptions(
  sourceProgrammeType: ProgrammeTypeValue,
  clubProgrammeTypes: readonly StudentPortalAccessProgrammeType[],
): AddStudentProgrammeAccessOption[] {
  const source = normalizePortalAccessSourceProgrammeType(sourceProgrammeType);

  return clubProgrammeTypes.map((programmeType) => ({
    programmeType,
    label: programmeStudentAreaLabel(programmeType),
    defaultChecked: programmeType === source,
  }));
}

export function buildAddStudentBookingAccessOptions(
  sourceProgrammeType: ProgrammeTypeValue,
  clubProgrammeTypes: readonly StudentPortalAccessProgrammeType[],
): AddStudentProgrammeAccessOption[] {
  const source = normalizePortalAccessSourceProgrammeType(sourceProgrammeType);

  return clubProgrammeTypes.map((programmeType) => ({
    programmeType,
    label: programmeBookingAccessLabel(programmeType),
    defaultChecked:
      source === "bjj"
        ? true
        : programmeType === source,
  }));
}

/** Build Add Student options from actual public.programmes rows (no default type list). */
export function buildAddStudentProgrammeAccessOptionsFromRows(
  sourceProgrammeType: ProgrammeTypeValue,
  programmes: readonly AddStudentProgrammeRow[],
): {
  programmeMembershipOptions: AddStudentProgrammeAccessOption[];
  bookingAccessOptions: AddStudentProgrammeAccessOption[];
} {
  const source = normalizePortalAccessSourceProgrammeType(sourceProgrammeType);

  return {
    programmeMembershipOptions: programmes.map((programme) => ({
      programmeType: programme.programmeType,
      label: `${programme.name} Student`,
      defaultChecked: programme.programmeType === source,
    })),
    bookingAccessOptions: programmes.map((programme) => ({
      programmeType: programme.programmeType,
      label: `${programme.name} Classes`,
      defaultChecked:
        source === "bjj" ? true : programme.programmeType === source,
    })),
  };
}

/** @deprecated Use buildAddStudentProgrammeMembershipOptions */
export function buildAddStudentProgrammeAccessOptions(
  sourceProgrammeType: ProgrammeTypeValue,
  clubProgrammeTypes: readonly StudentPortalAccessProgrammeType[],
): AddStudentProgrammeAccessOption[] {
  return buildAddStudentProgrammeMembershipOptions(
    sourceProgrammeType,
    clubProgrammeTypes,
  );
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

export const PROGRAMME_NAME_MIN_LENGTH = 2;
export const PROGRAMME_NAME_MAX_LENGTH = 80;
export const PROGRAMME_SLUG_MAX_LENGTH = 60;
export const PROGRAMME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateProgrammeName(value: string): string {
  const name = value.trim();

  if (name.length < PROGRAMME_NAME_MIN_LENGTH) {
    throw new Error("Programme name must be at least 2 characters.");
  }

  if (name.length > PROGRAMME_NAME_MAX_LENGTH) {
    throw new Error(
      `Programme name must be ${PROGRAMME_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  return name;
}

export function validateProgrammeSlug(value: string): string {
  const slug = value.trim().toLowerCase();

  if (!slug) {
    throw new Error("Programme slug is required.");
  }

  if (slug.length > PROGRAMME_SLUG_MAX_LENGTH) {
    throw new Error(
      `Programme slug must be ${PROGRAMME_SLUG_MAX_LENGTH} characters or fewer.`,
    );
  }

  if (!PROGRAMME_SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Programme slug must use lowercase letters, numbers, and hyphens only.",
    );
  }

  return slug;
}

export function inferProgrammeTypeFromSlug(slug: string): ProgrammeTypeValue {
  const normalized = slug.trim().toLowerCase();

  if (normalized === BJJ_PROGRAMME_SLUG) {
    return "bjj";
  }

  if (normalized === "muay-thai") {
    return "muay_thai";
  }

  if (normalized === "strength-conditioning") {
    return "strength_conditioning";
  }

  return "custom";
}

export function programmeTypeEnablesAdminArea(programmeType: ProgrammeTypeValue) {
  return programmeType !== "strength_conditioning";
}

export function isProgrammeSlugTakenInClub(
  slug: string,
  existingSlugs: readonly string[],
  options?: { ignoreSlug?: string },
): boolean {
  const normalized = slug.trim().toLowerCase();
  const ignore = options?.ignoreSlug?.trim().toLowerCase();

  return existingSlugs.some((existing) => {
    const existingNormalized = existing.trim().toLowerCase();

    if (existingNormalized !== normalized) {
      return false;
    }

    return existingNormalized !== ignore;
  });
}

export const CREATE_PROGRAMME_TEMPLATE_VALUES = [
  "bjj",
  "muay_thai",
  "blank",
] as const;

export type CreateProgrammeTemplateValue =
  (typeof CREATE_PROGRAMME_TEMPLATE_VALUES)[number];

export const CREATE_PROGRAMME_TEMPLATE_OPTIONS: {
  value: CreateProgrammeTemplateValue;
  label: string;
}[] = [
  { value: "bjj", label: "BJJ defaults" },
  { value: "muay_thai", label: "Muay Thai defaults" },
  { value: "blank", label: "Blank / custom" },
];

export function parseCreateProgrammeTemplateValue(
  value: string,
): CreateProgrammeTemplateValue {
  if (
    !CREATE_PROGRAMME_TEMPLATE_VALUES.includes(value as CreateProgrammeTemplateValue)
  ) {
    return "blank";
  }

  return value as CreateProgrammeTemplateValue;
}

export function defaultProgrammeSettingsForCreateTemplate(
  template: CreateProgrammeTemplateValue,
): ProgrammeFeatureSettings {
  if (template === "blank") {
    return defaultProgrammeSettingsForType("custom");
  }

  return defaultProgrammeSettingsForType(template);
}

export interface ParsedProgrammeCreateInput {
  name: string;
  slug: string;
  settings: ProgrammeFeatureSettings;
  adminAreaEnabled: boolean;
}

export function parseProgrammeCreateFormData(
  formData: FormData,
): ParsedProgrammeCreateInput {
  const name = validateProgrammeName(String(formData.get("programmeName") ?? ""));
  const slugInput = String(formData.get("programmeSlug") ?? "").trim();
  const slug = slugInput
    ? validateProgrammeSlug(slugInput)
    : validateProgrammeSlug(slugifyProgrammeName(name));
  const settings = parseProgrammeFeatureSettings(formData);
  const adminAreaEnabled = formData.get("adminAreaEnabled") === "on";

  return { name, slug, settings, adminAreaEnabled };
}

export interface ProgrammeDeleteLinkCounts {
  programmeMemberships: number;
  programmeBookingAccess: number;
  classes: number;
  classSessions: number;
  beltSystems: number;
}

export interface ProgrammeDeleteEligibility {
  canDelete: boolean;
  blockedReasons: string[];
  linkCounts: ProgrammeDeleteLinkCounts;
}

export const STANDARD_PROGRAMME_TYPES_FOR_DELETE = [
  "bjj",
  "muay_thai",
  "strength_conditioning",
] as const satisfies readonly ProgrammeTypeValue[];

export function isStandardProgrammeTypeForDelete(
  programmeType: ProgrammeTypeValue,
): boolean {
  return (STANDARD_PROGRAMME_TYPES_FOR_DELETE as readonly string[]).includes(
    programmeType,
  );
}

function formatProgrammeDeleteCountReason(
  count: number,
  singular: string,
  plural: string,
  suffix: string,
) {
  const noun = count === 1 ? singular : plural;
  return `${count} ${noun} ${suffix}.`;
}

export function buildProgrammeDeleteEligibility(
  linkCounts: ProgrammeDeleteLinkCounts,
  programmeType: ProgrammeTypeValue,
): ProgrammeDeleteEligibility {
  const blockedReasons: string[] = [];

  if (linkCounts.programmeMemberships > 0) {
    blockedReasons.push(
      formatProgrammeDeleteCountReason(
        linkCounts.programmeMemberships,
        "student is",
        "students are",
        "enrolled in this programme",
      ),
    );
  }

  if (linkCounts.programmeBookingAccess > 0) {
    blockedReasons.push(
      formatProgrammeDeleteCountReason(
        linkCounts.programmeBookingAccess,
        "student has",
        "students have",
        "portal booking access for this programme",
      ),
    );
  }

  if (linkCounts.classes > 0) {
    blockedReasons.push(
      formatProgrammeDeleteCountReason(
        linkCounts.classes,
        "class template is",
        "class templates are",
        "linked to this programme",
      ),
    );
  }

  if (linkCounts.classSessions > 0) {
    blockedReasons.push(
      formatProgrammeDeleteCountReason(
        linkCounts.classSessions,
        "scheduled class session is",
        "scheduled class sessions are",
        "linked to this programme",
      ),
    );
  }

  if (linkCounts.beltSystems > 0) {
    blockedReasons.push(
      formatProgrammeDeleteCountReason(
        linkCounts.beltSystems,
        "belt system is",
        "belt systems are",
        "linked to this programme",
      ),
    );
  }

  if (programmeType === "bjj" && blockedReasons.length > 0) {
    blockedReasons.push(
      "BJJ programmes cannot be deleted while they have linked academy data.",
    );
  }

  return {
    canDelete: blockedReasons.length === 0,
    blockedReasons,
    linkCounts,
  };
}

export function validateProgrammeDeleteConfirmation(
  typedName: string,
  programmeName: string,
) {
  if (typedName.trim() !== programmeName.trim()) {
    throw new Error(
      `Type the programme name "${programmeName}" to confirm deletion.`,
    );
  }
}
