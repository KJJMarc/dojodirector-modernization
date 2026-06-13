import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { ProgrammeType } from "@/lib/admin-programme-types";
import {
  BJJ_PROGRAMME_SLUG,
  buildAdminAreaProgrammeClassScope,
  classBelongsToAdminAreaProgrammeScope,
  LEGACY_BJJ_PROGRAMME_ID,
  PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE,
  buildStudentBjjFeatureVisibility,
  type AddStudentProgrammeRow,
  isStudentPortalAccessProgrammeType,
  defaultProgrammeSettingsForType,
  filterProgrammesForStudentAccessForms,
  formatProgrammeTypeOptionLabel,
  inferProgrammeTypeFromSlug,
  noBjjProgrammeFeatureVisibility,
  programmeNameForType,
  programmeSlugForType,
  programmeTypeEnablesAdminArea,
  validateProgrammeName,
  validateProgrammeSlug,
  STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES,
  type AdminProgramme,
  type CreatableProgrammeTypeValue,
  type ProgrammeFeatureSettings,
  type ProgrammeTypeValue,
  type StudentBjjFeatureVisibility,
  type StudentPortalAccessProgrammeType,
} from "@/lib/admin-programmes.shared";
import {
  countActiveStudentMemberships,
  countClubMemberships,
  loadClubMembershipRows,
  loadClubMembershipBackfillRows,
  loadAdminStudentProfileRowsByIds,
} from "@/lib/admin-club-memberships.server";
import { isActiveStudentClubMembership } from "@/lib/admin-student-membership.shared";
import type { BookingStudentOption } from "@/lib/admin-session-bookings.shared";
import { getStudentFullName } from "@/lib/attendance";
import {
  matchesAdminStudentListStatusFilter,
  type AdminStudentListStatusFilter,
} from "@/lib/admin-students";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import type {
  AdminStudentProgrammeAccessSummary,
  AdminStudentProgrammeMembershipSummary,
} from "@/lib/admin-student-profile.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

interface ProgrammeRow {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  programme_type: ProgrammeTypeValue;
  sort_order: number;
  is_active: boolean;
  attendance_tracking_enabled: boolean;
  attendance_cards_enabled: boolean;
  grading_system_enabled: boolean;
  belts_ranks_enabled: boolean;
  retention_tracking_enabled: boolean;
  student_portal_access_enabled: boolean;
  class_booking_enabled: boolean;
  promotion_candidates_enabled: boolean;
  admin_area_enabled?: boolean;
}

function isMissingProgrammesTable(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";

  if (
    message.includes("programmes") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find the table"))
  ) {
    return true;
  }

  if (error.code === "PGRST205" || error.code === "42P01") {
    return true;
  }

  return false;
}

let programmesSchemaAvailable: boolean | null = null;

/** Whether the programmes / programme_memberships tables are available in this database. */
export async function getProgrammesSchemaAvailable() {
  return isProgrammesSchemaAvailable();
}

async function isProgrammesSchemaAvailable() {
  if (programmesSchemaAvailable !== null) {
    return programmesSchemaAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("programmes").select("id").limit(1);
  programmesSchemaAvailable = !isMissingProgrammesTable(error);
  return programmesSchemaAvailable;
}

async function assertProgrammesSchemaAvailable() {
  if (!(await isProgrammesSchemaAvailable())) {
    throw new Error(PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE);
  }
}

function buildLegacyBjjProgrammeFallback(
  clubId: string,
  studentCount: number,
): AdminProgramme {
  return {
    id: LEGACY_BJJ_PROGRAMME_ID,
    clubId,
    name: "Brazilian Jiu Jitsu",
    slug: BJJ_PROGRAMME_SLUG,
    programmeType: "bjj",
    sortOrder: 1,
    isActive: true,
    adminAreaEnabled: true,
    studentCount,
    ...defaultProgrammeSettingsForType("bjj"),
  };
}

function isMissingProgrammeBookingAccessTable(
  error: { message?: string; code?: string } | null,
) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";

  if (
    message.includes("programme_booking_access") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find the table"))
  ) {
    return true;
  }

  if (error.code === "PGRST205" || error.code === "42P01") {
    return true;
  }

  return false;
}

let programmeBookingAccessSchemaAvailable: boolean | null = null;

async function isProgrammeBookingAccessSchemaAvailable() {
  if (programmeBookingAccessSchemaAvailable !== null) {
    return programmeBookingAccessSchemaAvailable;
  }

  if (!(await isProgrammesSchemaAvailable())) {
    programmeBookingAccessSchemaAvailable = false;
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("programme_booking_access").select("id").limit(1);
  programmeBookingAccessSchemaAvailable = !isMissingProgrammeBookingAccessTable(error);
  return programmeBookingAccessSchemaAvailable;
}

function isBjjProgramme(input: {
  slug: string;
  programmeType?: ProgrammeTypeValue;
  programme_type?: ProgrammeTypeValue;
}) {
  const programmeType = input.programmeType ?? input.programme_type;
  return input.slug === BJJ_PROGRAMME_SLUG || programmeType === "bjj";
}

function normalizeProgrammeMembershipStatus(status: string | null) {
  if (status === "active" || status === "inactive" || status === "paused") {
    return status;
  }

  if (status === "suspended") {
    return "paused";
  }

  return "active";
}

async function shouldUseMembershipStudentCountFallback(
  clubId: string,
  programme: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
  programmeMembershipCount: number,
) {
  if (programme.id === LEGACY_BJJ_PROGRAMME_ID) {
    return true;
  }

  if (!isBjjProgramme(programme)) {
    return false;
  }

  if (programmeMembershipCount > 0) {
    return false;
  }

  return (await countActiveStudentMemberships(clubId)) > 0;
}

async function queryProgrammeMembershipUserIds(
  programmeId: string,
  options?: { activeOnly?: boolean },
): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("programme_memberships")
    .select("user_id")
    .eq("programme_id", programmeId);

  if (options?.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load programme memberships: ${error.message}`);
  }

  return Array.from(
    new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id)),
  );
}

async function loadActiveProgrammeMembershipUserIds(
  programmeId: string,
): Promise<string[]> {
  return queryProgrammeMembershipUserIds(programmeId, { activeOnly: true });
}

async function loadProgrammeMemberUserIdsForClub(
  clubId: string,
  options?: { activeOnly?: boolean },
): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId);

  if (programmesError) {
    throw new Error(`Failed to load club programmes: ${programmesError.message}`);
  }

  const programmeIds = ((programmes ?? []) as { id: string }[]).map(
    (programme) => programme.id,
  );

  if (programmeIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("programme_memberships")
    .select("user_id")
    .in("programme_id", programmeIds);

  if (options?.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load club programme memberships: ${error.message}`);
  }

  return Array.from(
    new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id)),
  );
}

async function loadActiveProgrammeMemberUserIdsForClub(
  clubId: string,
): Promise<string[]> {
  return loadProgrammeMemberUserIdsForClub(clubId, { activeOnly: true });
}

/** Single source of truth for programme student area counts and member lists. */
export async function resolveProgrammeStudentAreaMemberUserIds(
  clubId: string,
  programme: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
): Promise<string[]> {
  const membershipRows = await loadClubMembershipRows(clubId);
  const activeClubMemberIds = new Set(
    membershipRows
      .filter((membership) => isActiveMembershipStatus(membership.status))
      .map((membership) => membership.user_id),
  );

  if (activeClubMemberIds.size === 0) {
    return [];
  }

  const studentRoleIds = membershipRows
    .filter(isActiveStudentClubMembership)
    .map((membership) => membership.user_id);

  if (programme.id === LEGACY_BJJ_PROGRAMME_ID) {
    const programmeMemberIds = await loadActiveProgrammeMemberUserIdsForClub(clubId);
    const memberProfileIds = programmeMemberIds.filter((userId) =>
      activeClubMemberIds.has(userId),
    );

    return Array.from(new Set([...studentRoleIds, ...memberProfileIds]));
  }

  const programmeMemberIds = await loadActiveProgrammeMembershipUserIds(programme.id);
  const memberProfileIds = programmeMemberIds.filter((userId) =>
    activeClubMemberIds.has(userId),
  );

  if (
    memberProfileIds.length === 0 &&
    (await shouldUseMembershipStudentCountFallback(
      clubId,
      programme,
      programmeMemberIds.length,
    ))
  ) {
    return studentRoleIds.filter((userId) => activeClubMemberIds.has(userId));
  }

  return memberProfileIds;
}

/**
 * Programme student-area scope for admin lists.
 * Uses the same active programme membership scope as resolveProgrammeStudentAreaMemberUserIds,
 * then applies the club membership status filter (default active — matches programme card counts).
 */
export async function resolveProgrammeStudentAreaAdminListUserIds(
  clubId: string,
  programme: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
  statusFilter: AdminStudentListStatusFilter = "active",
): Promise<string[]> {
  const membershipRows = await loadClubMembershipRows(clubId);
  let programmeScopeUserIds: string[];

  if (programme.id === LEGACY_BJJ_PROGRAMME_ID) {
    const activeStudentRoleIds = membershipRows
      .filter(isActiveStudentClubMembership)
      .map((membership) => membership.user_id);
    const programmeMemberIds = await loadActiveProgrammeMemberUserIdsForClub(clubId);
    programmeScopeUserIds = Array.from(
      new Set([...activeStudentRoleIds, ...programmeMemberIds]),
    );
  } else {
    programmeScopeUserIds = await loadActiveProgrammeMembershipUserIds(programme.id);

    if (
      programmeScopeUserIds.length === 0 &&
      (await shouldUseMembershipStudentCountFallback(clubId, programme, 0))
    ) {
      programmeScopeUserIds = membershipRows
        .filter((membership) => membership.role === "student")
        .map((membership) => membership.user_id);
    }
  }

  const programmeScopeSet = new Set(programmeScopeUserIds);

  return Array.from(
    new Set(
      membershipRows
        .filter((membership) => programmeScopeSet.has(membership.user_id))
        .filter((membership) =>
          matchesAdminStudentListStatusFilter(membership.status, statusFilter),
        )
        .map((membership) => membership.user_id),
    ),
  );
}

async function resolveProgrammeStudentCount(
  clubId: string,
  programme: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
) {
  const userIds = await resolveProgrammeStudentAreaMemberUserIds(clubId, programme);
  return userIds.length;
}

function mapProgrammeRow(
  row: ProgrammeRow,
  studentCount = 0,
): AdminProgramme {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    slug: row.slug,
    programmeType: row.programme_type,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    adminAreaEnabled: row.admin_area_enabled ?? row.programme_type === "bjj",
    studentCount,
    attendanceTrackingEnabled: row.attendance_tracking_enabled,
    attendanceCardsEnabled: row.attendance_cards_enabled,
    gradingSystemEnabled: row.grading_system_enabled,
    beltsRanksEnabled: row.belts_ranks_enabled,
    retentionTrackingEnabled: row.retention_tracking_enabled,
    studentPortalAccessEnabled: row.student_portal_access_enabled,
    classBookingEnabled: row.class_booking_enabled,
    promotionCandidatesEnabled: row.promotion_candidates_enabled,
  };
}

const PROGRAMME_ROW_SELECT =
  "id, club_id, name, slug, programme_type, sort_order, is_active, admin_area_enabled, attendance_tracking_enabled, attendance_cards_enabled, grading_system_enabled, belts_ranks_enabled, retention_tracking_enabled, student_portal_access_enabled, class_booking_enabled, promotion_candidates_enabled";

const PROGRAMME_ROW_SELECT_LEGACY =
  "id, club_id, name, slug, programme_type, sort_order, is_active, attendance_tracking_enabled, attendance_cards_enabled, grading_system_enabled, belts_ranks_enabled, retention_tracking_enabled, student_portal_access_enabled, class_booking_enabled, promotion_candidates_enabled";

function isMissingAdminAreaEnabledColumn(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("admin_area_enabled");
}

function filterAdminAreaProgrammeRows(rows: ProgrammeRow[]) {
  return rows.filter((row) => isProgrammeVisibleInAdminArea(row));
}

function isProgrammeVisibleInAdminArea(row: ProgrammeRow) {
  if (row.admin_area_enabled !== undefined) {
    return row.admin_area_enabled;
  }

  return row.programme_type === "bjj";
}

async function loadProgrammeRowsForClub(
  clubId: string,
  options: { adminAreaOnly?: boolean } = {},
) {
  const supabase = getSupabaseAdminClient();
  let { data, error } = await supabase
    .from("programmes")
    .select(PROGRAMME_ROW_SELECT)
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error && isMissingAdminAreaEnabledColumn(error)) {
    const legacyResult = await supabase
      .from("programmes")
      .select(PROGRAMME_ROW_SELECT_LEGACY)
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }

  if (error) {
    throw new Error(`Failed to load programmes: ${error.message}`);
  }

  let rows = (data ?? []) as ProgrammeRow[];

  if (options.adminAreaOnly) {
    rows = filterAdminAreaProgrammeRows(rows);
  }

  return rows;
}

const STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST: ProgrammeTypeValue[] = [
  ...STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES,
];

async function ensureStudentPortalAccessProgrammeRows(
  clubId: string,
  programmeTypes: ProgrammeTypeValue[] = STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST,
) {
  if (!(await isProgrammesSchemaAvailable())) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const existingRows = await loadProgrammeRowsForClub(clubId);
  const existingByType = new Map(
    existingRows.map((row) => [row.programme_type, row]),
  );

  for (const programmeType of programmeTypes) {
    if (existingByType.has(programmeType)) {
      continue;
    }

    const settings = defaultProgrammeSettingsForType(programmeType);
    const row = {
      club_id: clubId,
      name: programmeNameForType(programmeType),
      slug: programmeSlugForType(programmeType),
      programme_type: programmeType,
      sort_order:
        programmeType === "bjj" ? 1 : programmeType === "muay_thai" ? 2 : 3,
      attendance_tracking_enabled: settings.attendanceTrackingEnabled,
      attendance_cards_enabled: settings.attendanceCardsEnabled,
      grading_system_enabled: settings.gradingSystemEnabled,
      belts_ranks_enabled: settings.beltsRanksEnabled,
      retention_tracking_enabled: settings.retentionTrackingEnabled,
      student_portal_access_enabled: settings.studentPortalAccessEnabled,
      class_booking_enabled: settings.classBookingEnabled,
      promotion_candidates_enabled: settings.promotionCandidatesEnabled,
    };

    let { error } = await supabase.from("programmes").insert({
      ...row,
      admin_area_enabled: programmeType === "bjj",
    });

    if (error && isMissingAdminAreaEnabledColumn(error)) {
      ({ error } = await supabase.from("programmes").insert(row));
    }

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(
        `Failed to ensure student portal access programme rows: ${error.message}`,
      );
    }
  }
}

async function backfillProgrammeMembershipsForTypes(
  clubId: string,
  programmeTypes: ProgrammeTypeValue[],
) {
  const supabase = getSupabaseAdminClient();

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", clubId)
    .in("programme_type", programmeTypes);

  if (programmesError) {
    throw new Error(`Failed to load programmes for backfill: ${programmesError.message}`);
  }

  if (!programmes || programmes.length === 0) {
    return { backfillRan: false, programmeMembershipsCount: 0 };
  }

  const membershipRows = await loadClubMembershipBackfillRows(clubId);

  if (membershipRows.length === 0) {
    return { backfillRan: false, programmeMembershipsCount: 0 };
  }

  const batchSize = 100;
  let backfillRan = false;

  for (const programme of programmes as {
    id: string;
    programme_type: ProgrammeTypeValue;
  }[]) {
    const { count: existingCount, error: existingCountError } = await supabase
      .from("programme_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("programme_id", programme.id);

    if (existingCountError) {
      throw new Error(
        `Failed to count programme memberships before backfill: ${existingCountError.message}`,
      );
    }

    if ((existingCount ?? 0) >= membershipRows.length) {
      continue;
    }

    for (let index = 0; index < membershipRows.length; index += batchSize) {
      const batch = membershipRows.slice(index, index + batchSize).map((membership) => ({
        programme_id: programme.id,
        user_id: membership.user_id,
        status: normalizeProgrammeMembershipStatus(membership.status),
        joined_at: membership.joined_at,
      }));

      const { error } = await supabase.from("programme_memberships").upsert(batch, {
        onConflict: "programme_id,user_id",
        ignoreDuplicates: true,
      });

      if (error) {
        throw new Error(`Failed to backfill programme memberships: ${error.message}`);
      }
    }

    backfillRan = true;
  }

  const bjjProgramme = (programmes as { id: string; programme_type: ProgrammeTypeValue }[]).find(
    (programme) => programme.programme_type === "bjj",
  );

  if (!bjjProgramme) {
    return { backfillRan, programmeMembershipsCount: 0 };
  }

  const { count: finalCount, error: finalCountError } = await supabase
    .from("programme_memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("programme_id", bjjProgramme.id)
    .eq("status", "active");

  if (finalCountError) {
    throw new Error(
      `Failed to count programme memberships after backfill: ${finalCountError.message}`,
    );
  }

  return {
    backfillRan,
    programmeMembershipsCount: finalCount ?? 0,
  };
}

async function backfillProgrammeBookingAccessForClub(clubId: string) {
  if (!(await isProgrammeBookingAccessSchemaAvailable())) {
    return { backfillRan: false };
  }

  const supabase = getSupabaseAdminClient();

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", clubId)
    .in("programme_type", STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST);

  if (programmesError) {
    throw new Error(`Failed to load programmes for booking access backfill: ${programmesError.message}`);
  }

  if (!programmes || programmes.length === 0) {
    return { backfillRan: false };
  }

  const membershipRows = await loadClubMembershipBackfillRows(clubId);

  if (membershipRows.length === 0) {
    return { backfillRan: false };
  }

  const batchSize = 100;
  let backfillRan = false;

  for (const programme of programmes as { id: string }[]) {
    const { count: existingCount, error: existingCountError } = await supabase
      .from("programme_booking_access")
      .select("user_id", { count: "exact", head: true })
      .eq("programme_id", programme.id);

    if (existingCountError) {
      throw new Error(
        `Failed to count booking access before backfill: ${existingCountError.message}`,
      );
    }

    if ((existingCount ?? 0) >= membershipRows.length) {
      continue;
    }

    for (let index = 0; index < membershipRows.length; index += batchSize) {
      const batch = membershipRows.slice(index, index + batchSize).map((membership) => ({
        programme_id: programme.id,
        user_id: membership.user_id,
      }));

      const { error } = await supabase.from("programme_booking_access").upsert(batch, {
        onConflict: "programme_id,user_id",
        ignoreDuplicates: true,
      });

      if (error) {
        throw new Error(`Failed to backfill programme booking access: ${error.message}`);
      }
    }

    backfillRan = true;
  }

  return { backfillRan };
}

export async function ensureStudentPortalBookingAccessBackfill(clubId: string) {
  if (!(await isProgrammesSchemaAvailable())) {
    return { backfillRan: false };
  }

  await ensureStudentPortalAccessProgrammeRows(clubId);

  return backfillProgrammeBookingAccessForClub(clubId);
}

/** @deprecated Use ensureStudentPortalBookingAccessBackfill. */
export async function ensureStudentPortalAccessMembershipBackfill(clubId: string) {
  return ensureStudentPortalBookingAccessBackfill(clubId);
}

export async function ensureBjjProgrammeMembershipBackfill(clubId: string): Promise<{
  backfillRan: boolean;
  programmeMembershipsCount: number;
}> {
  if (!(await isProgrammesSchemaAvailable())) {
    return { backfillRan: false, programmeMembershipsCount: 0 };
  }

  await ensureStudentPortalAccessProgrammeRows(clubId, ["bjj"]);

  return backfillProgrammeMembershipsForTypes(clubId, ["bjj"]);
}

/** @deprecated Use ensureBjjProgrammeMembershipBackfill or ensureStudentPortalBookingAccessBackfill. */
export async function ensureDefaultProgrammeMembershipBackfill(clubId: string) {
  await ensureBjjProgrammeMembershipBackfill(clubId);
  return ensureStudentPortalBookingAccessBackfill(clubId);
}

export interface ProgrammeMembershipDebugReport {
  clubId: string;
  programmesSchemaAvailable: boolean;
  membershipsCount: number;
  programmesCount: number;
  bjjProgrammeId: string | null;
  programmeMembershipsCount: number;
  bjjStudentCountDisplayed: number;
  usingMembershipFallback: boolean;
  backfillRan: boolean;
  sampleMemberNames: string[];
}

export async function buildProgrammeMembershipDebugReport(
  clubId: string,
): Promise<ProgrammeMembershipDebugReport> {
  const programmesSchemaAvailable = await isProgrammesSchemaAvailable();
  const membershipsCount = await countClubMemberships(clubId);
  let programmesCount = 0;
  let bjjProgrammeId: string | null = null;
  let programmeMembershipsCount = 0;
  let backfillRan = false;
  let usingMembershipFallback = false;
  let bjjStudentCountDisplayed = await countActiveStudentMemberships(clubId);
  let sampleUserIds: string[] = [];

  if (programmesSchemaAvailable) {
    const supabase = getSupabaseAdminClient();

    const { count, error: programmesCountError } = await supabase
      .from("programmes")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId);

    if (programmesCountError) {
      throw new Error(`Failed to count programmes: ${programmesCountError.message}`);
    }

    programmesCount = count ?? 0;

    const backfillResult = await ensureBjjProgrammeMembershipBackfill(clubId);
    backfillRan = backfillResult.backfillRan;
    programmeMembershipsCount = backfillResult.programmeMembershipsCount;

    const { data: bjjProgramme, error: bjjProgrammeError } = await supabase
      .from("programmes")
      .select("id, slug, programme_type")
      .eq("club_id", clubId)
      .eq("slug", BJJ_PROGRAMME_SLUG)
      .maybeSingle();

    if (bjjProgrammeError) {
      throw new Error(`Failed to load BJJ programme: ${bjjProgrammeError.message}`);
    }

    bjjProgrammeId = bjjProgramme?.id ?? null;

    if (bjjProgrammeId) {
      const { count: activeCount, error: activeCountError } = await supabase
        .from("programme_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("programme_id", bjjProgrammeId)
        .eq("status", "active");

      if (activeCountError) {
        throw new Error(
          `Failed to count BJJ programme memberships: ${activeCountError.message}`,
        );
      }

      programmeMembershipsCount = activeCount ?? programmeMembershipsCount;

      usingMembershipFallback = await shouldUseMembershipStudentCountFallback(
        clubId,
        {
          id: bjjProgrammeId,
          slug: BJJ_PROGRAMME_SLUG,
          programmeType: "bjj",
        },
        programmeMembershipsCount,
      );

      bjjStudentCountDisplayed = usingMembershipFallback
        ? await countActiveStudentMemberships(clubId)
        : programmeMembershipsCount;

      const { data: programmeMembers, error: programmeMembersError } = await supabase
        .from("programme_memberships")
        .select("user_id")
        .eq("programme_id", bjjProgrammeId)
        .eq("status", "active")
        .order("user_id", { ascending: true })
        .limit(10);

      if (programmeMembersError) {
        throw new Error(
          `Failed to load BJJ programme member sample: ${programmeMembersError.message}`,
        );
      }

      sampleUserIds = ((programmeMembers ?? []) as { user_id: string }[]).map(
        (row) => row.user_id,
      );

      if (sampleUserIds.length === 0 && usingMembershipFallback) {
        const membershipRows = await loadClubMembershipBackfillRows(clubId);
        sampleUserIds = membershipRows.slice(0, 10).map((row) => row.user_id);
      }
    }
  } else {
    usingMembershipFallback = true;
    bjjProgrammeId = LEGACY_BJJ_PROGRAMME_ID;

    const membershipRows = await loadClubMembershipBackfillRows(clubId);
    sampleUserIds = membershipRows.slice(0, 10).map((row) => row.user_id);
  }

  const profilesById = await loadAdminStudentProfileRowsByIds(sampleUserIds);
  const sampleMemberNames = sampleUserIds.map((userId) => {
    const profile = profilesById.get(userId);

    if (!profile) {
      return userId;
    }

    const name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || profile.email || userId;
  });

  return {
    clubId,
    programmesSchemaAvailable,
    membershipsCount,
    programmesCount,
    bjjProgrammeId,
    programmeMembershipsCount,
    bjjStudentCountDisplayed,
    usingMembershipFallback,
    backfillRan,
    sampleMemberNames,
  };
}

async function loadProgrammeStudentCounts(
  clubId: string,
  programmeIds: string[],
  programmesById: Map<string, Pick<AdminProgramme, "id" | "slug" | "programmeType">>,
) {
  const counts = new Map<string, number>();

  await Promise.all(
    programmeIds.map(async (programmeId) => {
      const programme = programmesById.get(programmeId);

      if (!programme) {
        counts.set(programmeId, 0);
        return;
      }

      const userIds = await resolveProgrammeStudentAreaMemberUserIds(clubId, programme);
      counts.set(programmeId, userIds.length);
    }),
  );

  return counts;
}

export async function loadClubProgrammes(clubId: string): Promise<AdminProgramme[]> {
  if (!(await isProgrammesSchemaAvailable())) {
    const studentCount = await countActiveStudentMemberships(clubId);
    return [buildLegacyBjjProgrammeFallback(clubId, studentCount)];
  }

  const rows = await loadProgrammeRowsForClub(clubId, { adminAreaOnly: true });
  const programmesById = new Map(
    rows.map((row) => {
      const programme = mapProgrammeRow(row, 0);
      return [programme.id, programme] as const;
    }),
  );
  const counts = await loadProgrammeStudentCounts(
    clubId,
    rows.map((row) => row.id),
    programmesById,
  );

  return rows.map((row) => mapProgrammeRow(row, counts.get(row.id) ?? 0));
}

export async function requireClubProgrammeBySlug(
  clubId: string,
  programmeSlug: string,
): Promise<AdminProgramme> {
  if (!(await isProgrammesSchemaAvailable())) {
    if (programmeSlug === BJJ_PROGRAMME_SLUG) {
      const studentCount = await countActiveStudentMemberships(clubId);
      return buildLegacyBjjProgrammeFallback(clubId, studentCount);
    }

    throw new Error(
      PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE,
    );
  }

  const supabase = getSupabaseAdminClient();

  let { data, error } = await supabase
    .from("programmes")
    .select(PROGRAMME_ROW_SELECT)
    .eq("club_id", clubId)
    .eq("slug", programmeSlug)
    .maybeSingle();

  if (error && isMissingAdminAreaEnabledColumn(error)) {
    ({ data, error } = await supabase
      .from("programmes")
      .select(PROGRAMME_ROW_SELECT_LEGACY)
      .eq("club_id", clubId)
      .eq("slug", programmeSlug)
      .maybeSingle());
  }

  if (error) {
    throw new Error(`Failed to load programme: ${error.message}`);
  }

  if (!data) {
    throw new Error("Programme not found.");
  }

  const row = data as ProgrammeRow;

  if (!isProgrammeVisibleInAdminArea(row)) {
    throw new Error("Programme not found.");
  }

  const programme = mapProgrammeRow(row, 0);
  const studentCount = await resolveProgrammeStudentCount(clubId, programme);

  return mapProgrammeRow(row, studentCount);
}

export async function requireClubBjjProgramme(clubId: string): Promise<AdminProgramme> {
  return requireClubProgrammeBySlug(clubId, BJJ_PROGRAMME_SLUG);
}

/** Active programme_memberships row for the club's BJJ programme (not belt or grading settings). */
export async function studentHasActiveBjjProgrammeMembership(
  clubId: string,
  userId: string,
): Promise<boolean> {
  return studentHasActiveProgrammeMembership(clubId, userId, "bjj");
}

async function studentHasActiveProgrammeMembership(
  clubId: string,
  userId: string,
  programmeType: ProgrammeTypeValue,
): Promise<boolean> {
  if (!(await isProgrammesSchemaAvailable())) {
    return programmeType === "bjj";
  }

  const supabase = getSupabaseAdminClient();
  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId)
    .eq("programme_type", programmeType)
    .maybeSingle();

  if (programmeError) {
    throw new Error(`Failed to load programme: ${programmeError.message}`);
  }

  if (!programme) {
    return false;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("programme_memberships")
    .select("user_id")
    .eq("programme_id", programme.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to load programme membership: ${membershipError.message}`);
  }

  return Boolean(membership);
}

/** BJJ feature visibility for a student based on programme access and programme settings. */
export async function loadStudentBjjFeatureVisibility(
  clubId: string,
  userId: string,
): Promise<StudentBjjFeatureVisibility> {
  if (!(await isProgrammesSchemaAvailable())) {
    return buildStudentBjjFeatureVisibility(
      true,
      defaultProgrammeSettingsForType("bjj"),
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select(
      "id, attendance_tracking_enabled, attendance_cards_enabled, grading_system_enabled, belts_ranks_enabled, promotion_candidates_enabled",
    )
    .eq("club_id", clubId)
    .eq("programme_type", "bjj")
    .maybeSingle();

  if (programmeError) {
    throw new Error(`Failed to load BJJ programme: ${programmeError.message}`);
  }

  if (!programme) {
    return noBjjProgrammeFeatureVisibility();
  }

  const hasProgrammeAccess = await studentHasActiveProgrammeMembership(
    clubId,
    userId,
    "bjj",
  );

  const settings = defaultProgrammeSettingsForType("bjj");
  const row = programme as {
    attendance_tracking_enabled: boolean | null;
    attendance_cards_enabled: boolean | null;
    grading_system_enabled: boolean | null;
    belts_ranks_enabled: boolean | null;
    promotion_candidates_enabled: boolean | null;
  };

  return buildStudentBjjFeatureVisibility(hasProgrammeAccess, {
    ...settings,
    attendanceTrackingEnabled: Boolean(row.attendance_tracking_enabled),
    attendanceCardsEnabled: Boolean(row.attendance_cards_enabled),
    gradingSystemEnabled: Boolean(row.grading_system_enabled),
    beltsRanksEnabled: Boolean(row.belts_ranks_enabled),
    promotionCandidatesEnabled: Boolean(row.promotion_candidates_enabled),
  });
}

/** Whether attendance cards are enabled for a programme type at this club. */
export async function getProgrammeAttendanceCardsEnabled(
  clubId: string,
  programmeType: ProgrammeTypeValue = "bjj",
): Promise<boolean> {
  if (!(await isProgrammesSchemaAvailable())) {
    return defaultProgrammeSettingsForType(programmeType).attendanceCardsEnabled;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("attendance_cards_enabled")
    .eq("club_id", clubId)
    .eq("programme_type", programmeType)
    .maybeSingle();

  if (error || !data) {
    return defaultProgrammeSettingsForType(programmeType).attendanceCardsEnabled;
  }

  return Boolean(data.attendance_cards_enabled);
}

export async function loadProgrammeMembershipUserIds(
  programmeId: string,
  clubId: string,
  programme?: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
): Promise<string[]> {
  if (programme) {
    return resolveProgrammeStudentAreaMemberUserIds(clubId, programme);
  }

  if (programmeId === LEGACY_BJJ_PROGRAMME_ID) {
    return resolveProgrammeStudentAreaMemberUserIds(clubId, {
      id: LEGACY_BJJ_PROGRAMME_ID,
      slug: BJJ_PROGRAMME_SLUG,
      programmeType: "bjj",
    });
  }

  const supabase = getSupabaseAdminClient();
  const { data: programmeRow, error: programmeError } = await supabase
    .from("programmes")
    .select("id, slug, programme_type")
    .eq("id", programmeId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (programmeError) {
    throw new Error(`Failed to load programme: ${programmeError.message}`);
  }

  if (!programmeRow) {
    return [];
  }

  return resolveProgrammeStudentAreaMemberUserIds(clubId, {
    id: programmeRow.id,
    slug: programmeRow.slug,
    programmeType: programmeRow.programme_type,
  });
}

export interface CreateAdminProgrammeInput {
  clubId: string;
  name: string;
  slug: string;
  settings: ProgrammeFeatureSettings;
  adminAreaEnabled: boolean;
}

export async function loadClubProgrammeSlugs(clubId: string): Promise<string[]> {
  if (!(await isProgrammesSchemaAvailable())) {
    return [BJJ_PROGRAMME_SLUG];
  }

  const rows = await loadProgrammeRowsForClub(clubId);
  return rows.map((row) => row.slug);
}

async function assertProgrammeSlugAvailableForCreate(
  clubId: string,
  slug: string,
  reEnableProgrammeId?: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("id, slug")
    .eq("club_id", clubId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate programme slug: ${error.message}`);
  }

  if (!data) {
    return;
  }

  if (reEnableProgrammeId && data.id === reEnableProgrammeId) {
    return;
  }

  throw new Error("A programme with this slug already exists at this academy.");
}

async function resolveCreatableProgrammeRow(
  clubId: string,
  programmeType: CreatableProgrammeTypeValue,
) {
  const supabase = getSupabaseAdminClient();

  let { data, error } = await supabase
    .from("programmes")
    .select("id, admin_area_enabled, programme_type")
    .eq("club_id", clubId)
    .eq("programme_type", programmeType)
    .maybeSingle();

  if (error && isMissingAdminAreaEnabledColumn(error)) {
    ({ data, error } = await supabase
      .from("programmes")
      .select("id, programme_type")
      .eq("club_id", clubId)
      .eq("programme_type", programmeType)
      .maybeSingle());
  }

  if (error) {
    throw new Error(`Failed to validate programme: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as {
    id: string;
    programme_type: ProgrammeTypeValue;
    admin_area_enabled?: boolean;
  };

  if (isProgrammeVisibleInAdminArea(row as ProgrammeRow)) {
    throw new Error("This programme already exists.");
  }

  return row;
}

function buildProgrammeRowPayload(
  input: CreateAdminProgrammeInput,
  programmeType: ProgrammeTypeValue,
) {
  return {
    name: input.name,
    slug: input.slug,
    programme_type: programmeType,
    admin_area_enabled: input.adminAreaEnabled,
    is_active: true,
    attendance_tracking_enabled: input.settings.attendanceTrackingEnabled,
    attendance_cards_enabled: input.settings.attendanceCardsEnabled,
    grading_system_enabled: input.settings.gradingSystemEnabled,
    belts_ranks_enabled: input.settings.beltsRanksEnabled,
    retention_tracking_enabled: input.settings.retentionTrackingEnabled,
    student_portal_access_enabled: input.settings.studentPortalAccessEnabled,
    class_booking_enabled: input.settings.classBookingEnabled,
    promotion_candidates_enabled: input.settings.promotionCandidatesEnabled,
    updated_at: new Date().toISOString(),
  };
}

export async function createAdminProgramme(
  input: CreateAdminProgrammeInput,
): Promise<AdminProgramme> {
  await assertProgrammesSchemaAvailable();

  const supabase = getSupabaseAdminClient();
  const name = validateProgrammeName(input.name);
  const slug = validateProgrammeSlug(input.slug);
  const programmeType = inferProgrammeTypeFromSlug(slug);

  if (!programmeTypeEnablesAdminArea(programmeType)) {
    throw new Error(
      "Strength & Conditioning cannot be enabled as a programme admin area yet.",
    );
  }

  let existingProgramme: Awaited<ReturnType<typeof resolveCreatableProgrammeRow>> =
    null;

  if (programmeType === "bjj" || programmeType === "muay_thai") {
    existingProgramme = await resolveCreatableProgrammeRow(
      input.clubId,
      programmeType,
    );
  }

  await assertProgrammeSlugAvailableForCreate(
    input.clubId,
    slug,
    existingProgramme?.id,
  );

  const rowPayload = buildProgrammeRowPayload(
    { ...input, name, slug },
    programmeType,
  );

  if (existingProgramme) {
    const { data, error } = await supabase
      .from("programmes")
      .update(rowPayload)
      .eq("id", existingProgramme.id)
      .eq("club_id", input.clubId)
      .select(PROGRAMME_ROW_SELECT)
      .single();

    if (error && isMissingAdminAreaEnabledColumn(error)) {
      const { admin_area_enabled: _adminAreaEnabled, ...legacyPayload } =
        rowPayload;
      const { data: legacyData, error: legacyError } = await supabase
        .from("programmes")
        .update(legacyPayload)
        .eq("id", existingProgramme.id)
        .eq("club_id", input.clubId)
        .select(PROGRAMME_ROW_SELECT_LEGACY)
        .single();

      if (legacyError) {
        throw new Error(`Failed to enable programme: ${legacyError.message}`);
      }

      return mapProgrammeRow(legacyData as ProgrammeRow, 0);
    }

    if (error) {
      throw new Error(`Failed to enable programme: ${error.message}`);
    }

    return mapProgrammeRow(data as ProgrammeRow, 0);
  }

  const { data: existingProgrammes, error: existingError } = await supabase
    .from("programmes")
    .select("sort_order")
    .eq("club_id", input.clubId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to load programme order: ${existingError.message}`);
  }

  const nextSortOrder =
    ((existingProgrammes?.[0] as { sort_order: number } | undefined)?.sort_order ??
      0) + 1;

  const { data, error } = await supabase
    .from("programmes")
    .insert({
      club_id: input.clubId,
      ...rowPayload,
      sort_order: nextSortOrder,
    })
    .select(PROGRAMME_ROW_SELECT)
    .single();

  if (error && isMissingAdminAreaEnabledColumn(error)) {
    const { admin_area_enabled: _adminAreaEnabled, ...legacyPayload } =
      rowPayload;
    const { data: legacyData, error: legacyError } = await supabase
      .from("programmes")
      .insert({
        club_id: input.clubId,
        ...legacyPayload,
        sort_order: nextSortOrder,
      })
      .select(PROGRAMME_ROW_SELECT_LEGACY)
      .single();

    if (legacyError) {
      throw new Error(`Failed to create programme: ${legacyError.message}`);
    }

    return mapProgrammeRow(legacyData as ProgrammeRow, 0);
  }

  if (error) {
    throw new Error(`Failed to create programme: ${error.message}`);
  }

  return mapProgrammeRow(data as ProgrammeRow, 0);
}

export interface UpdateAdminProgrammeSettingsInput {
  clubId: string;
  programmeSlug: string;
  name: string;
  settings: ProgrammeFeatureSettings;
  isActive: boolean;
}

export async function updateAdminProgrammeSettings(
  input: UpdateAdminProgrammeSettingsInput,
): Promise<AdminProgramme> {
  await assertProgrammesSchemaAvailable();

  const supabase = getSupabaseAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Programme name is required.");
  }

  const programme = await requireClubProgrammeBySlug(
    input.clubId,
    input.programmeSlug,
  );

  const { data, error } = await supabase
    .from("programmes")
    .update({
      name,
      is_active: input.isActive,
      attendance_tracking_enabled: input.settings.attendanceTrackingEnabled,
      attendance_cards_enabled: input.settings.attendanceCardsEnabled,
      grading_system_enabled: input.settings.gradingSystemEnabled,
      belts_ranks_enabled: input.settings.beltsRanksEnabled,
      retention_tracking_enabled: input.settings.retentionTrackingEnabled,
      student_portal_access_enabled: input.settings.studentPortalAccessEnabled,
      class_booking_enabled: input.settings.classBookingEnabled,
      promotion_candidates_enabled: input.settings.promotionCandidatesEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programme.id)
    .eq("club_id", input.clubId)
    .select(
      "id, club_id, name, slug, programme_type, sort_order, is_active, attendance_tracking_enabled, attendance_cards_enabled, grading_system_enabled, belts_ranks_enabled, retention_tracking_enabled, student_portal_access_enabled, class_booking_enabled, promotion_candidates_enabled",
    )
    .single();

  if (error) {
    throw new Error(`Failed to update programme settings: ${error.message}`);
  }

  const updatedProgramme = mapProgrammeRow(data as ProgrammeRow, 0);
  const studentCount = await resolveProgrammeStudentCount(
    input.clubId,
    updatedProgramme,
  );

  return mapProgrammeRow(data as ProgrammeRow, studentCount);
}

export async function countActiveProgrammeStudents(
  programmeId: string,
  clubId: string,
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("id, slug, programme_type")
    .eq("id", programmeId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load programme: ${error.message}`);
  }

  if (!data) {
    return 0;
  }

  const userIds = await resolveProgrammeStudentAreaMemberUserIds(clubId, {
    id: data.id,
    slug: data.slug,
    programmeType: data.programme_type,
  });

  return userIds.length;
}

interface AdminAreaClassRow {
  id: string;
  programme_id: string | null;
  programme_type: string;
  is_active: boolean | null;
}

async function loadAdminAreaProgrammeClassScope(
  clubId: string,
): Promise<ReturnType<typeof buildAdminAreaProgrammeClassScope>> {
  if (!(await isProgrammesSchemaAvailable())) {
    return { programmeIds: [], programmeTypes: ["bjj"] };
  }

  const rows = await loadProgrammeRowsForClub(clubId, { adminAreaOnly: true });

  return buildAdminAreaProgrammeClassScope(
    rows.map((row) => ({
      id: row.id,
      programmeType: row.programme_type,
    })),
  );
}

/** Active classes for all admin-area programmes (BJJ, Muay Thai, and future areas). */
export async function loadActiveAdminAreaClassIdsForClub(
  clubId: string,
): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const scope = await loadAdminAreaProgrammeClassScope(clubId);
  const { data, error } = await supabase
    .from("classes")
    .select("id, programme_id, programme_type, is_active")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Failed to load classes: ${error.message}`);
  }

  const classIds = new Set<string>();

  for (const row of (data ?? []) as AdminAreaClassRow[]) {
    if (row.is_active === false) {
      continue;
    }

    if (classBelongsToAdminAreaProgrammeScope(row, scope)) {
      classIds.add(row.id);
    }
  }

  return classIds;
}

/** Unique active students across all admin-area programmes (e.g. BJJ + Muay Thai). */
export async function countUniqueActiveProgrammeStudentsForClub(
  clubId: string,
): Promise<number> {
  if (!(await isProgrammesSchemaAvailable())) {
    return countActiveStudentMemberships(clubId);
  }

  const rows = await loadProgrammeRowsForClub(clubId, { adminAreaOnly: true });
  const programmes = rows.map((row) => mapProgrammeRow(row, 0));
  const uniqueUserIds = new Set<string>();

  await Promise.all(
    programmes.map(async (programme) => {
      const userIds = await resolveProgrammeStudentAreaMemberUserIds(
        clubId,
        programme,
      );

      for (const userId of userIds) {
        uniqueUserIds.add(userId);
      }
    }),
  );

  return uniqueUserIds.size;
}

async function assertProgrammeBelongsToClub(programmeId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("programmes")
    .select("id, club_id, name, slug")
    .eq("id", programmeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load programme: ${error.message}`);
  }

  if (!data || data.club_id !== clubId) {
    throw new Error("Programme not found.");
  }

  return data as { id: string; club_id: string; name: string; slug: string };
}

async function assertClubStudentMember(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("role", "student")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student is not an active club member.");
  }
}

/** Club students not yet in this programme student area (for add picker). */
export async function loadProgrammeStudentPickerOptions(
  clubId: string,
  programmeId: string,
): Promise<BookingStudentOption[]> {
  await assertProgrammesSchemaAvailable();
  await assertProgrammeBelongsToClub(programmeId, clubId);

  const supabase = getSupabaseAdminClient();

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("role", "student")
    .eq("status", "active");

  if (membershipsError) {
    throw new Error(`Unable to load club members: ${membershipsError.message}`);
  }

  const userIds = Array.from(
    new Set((membershipRows ?? []).map((row) => row.user_id as string)),
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: programmeMemberRows, error: programmeMembersError } = await supabase
    .from("programme_memberships")
    .select("user_id")
    .eq("programme_id", programmeId)
    .eq("status", "active")
    .in("user_id", userIds);

  if (programmeMembersError) {
    throw new Error(
      `Unable to load programme memberships: ${programmeMembersError.message}`,
    );
  }

  const existingMemberIds = new Set(
    (programmeMemberRows ?? []).map((row) => row.user_id as string),
  );
  const availableUserIds = userIds.filter((userId) => !existingMemberIds.has(userId));

  if (availableUserIds.length === 0) {
    return [];
  }

  const userById = await loadAdminStudentProfileRowsByIds(availableUserIds);
  const students = availableUserIds
    .map((userId) => userById.get(userId))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));

  students.sort((left, right) => {
    const lastNameCompare = (left.last_name ?? "").localeCompare(
      right.last_name ?? "",
      undefined,
      { sensitivity: "base" },
    );

    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }

    return (left.first_name ?? "").localeCompare(right.first_name ?? "", undefined, {
      sensitivity: "base",
    });
  });

  return students.map((user) => ({
    id: user.id,
    label: getStudentFullName(user.first_name, user.last_name),
    email: user.email,
  }));
}

export async function addStudentToProgrammeMembership(input: {
  clubId: string;
  programmeId: string;
  userId: string;
}) {
  await assertProgrammesSchemaAvailable();
  await assertProgrammeBelongsToClub(input.programmeId, input.clubId);
  await assertClubStudentMember(input.userId, input.clubId);

  const { data: existingMembership, error: existingError } =
    await getSupabaseAdminClient()
      .from("programme_memberships")
      .select("user_id, status")
      .eq("programme_id", input.programmeId)
      .eq("user_id", input.userId)
      .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check programme membership: ${existingError.message}`);
  }

  if (existingMembership?.status === "active") {
    throw new Error("Student is already in this programme.");
  }

  await ensureProgrammeMembership({
    programmeId: input.programmeId,
    userId: input.userId,
    status: "active",
  });
}

export async function removeStudentFromProgrammeMembership(input: {
  clubId: string;
  programmeId: string;
  userId: string;
}) {
  await assertProgrammesSchemaAvailable();
  await assertProgrammeBelongsToClub(input.programmeId, input.clubId);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programme_memberships")
    .delete()
    .eq("programme_id", input.programmeId)
    .eq("user_id", input.userId)
    .select("user_id");

  if (error) {
    throw new Error(`Failed to remove programme membership: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Student is not in this programme.");
  }
}

export async function ensureProgrammeMembership(input: {
  programmeId: string;
  userId: string;
  status?: string;
}) {
  if (input.programmeId === LEGACY_BJJ_PROGRAMME_ID) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("programme_memberships").upsert(
    {
      programme_id: input.programmeId,
      user_id: input.userId,
      status: input.status ?? "active",
      joined_at: todayDateKey(),
    },
    { onConflict: "programme_id,user_id" },
  );

  if (error) {
    throw new Error(`Failed to create programme membership: ${error.message}`);
  }
}

interface PortalAccessProgrammeItem {
  programmeId: string;
  name: string;
  programmeType: StudentPortalAccessProgrammeType;
}

interface PortalAccessProgrammeRow {
  id: string;
  name: string;
  programme_type: ProgrammeTypeValue;
  student_portal_access_enabled: boolean;
  admin_area_enabled?: boolean;
  created_at: string;
}

async function loadPortalAccessProgrammeRows(clubId: string): Promise<PortalAccessProgrammeRow[]> {
  const supabase = getSupabaseAdminClient();

  const initialResult = await supabase
    .from("programmes")
    .select(
      "id, name, programme_type, student_portal_access_enabled, admin_area_enabled, created_at",
    )
    .eq("club_id", clubId)
    .in("programme_type", STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (initialResult.error && isMissingAdminAreaEnabledColumn(initialResult.error)) {
    const fallbackResult = await supabase
      .from("programmes")
      .select("id, name, programme_type, student_portal_access_enabled, created_at")
      .eq("club_id", clubId)
      .in("programme_type", STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (fallbackResult.error) {
      throw new Error(`Failed to load programmes: ${fallbackResult.error.message}`);
    }

    return (fallbackResult.data ?? []) as PortalAccessProgrammeRow[];
  }

  if (initialResult.error) {
    throw new Error(`Failed to load programmes: ${initialResult.error.message}`);
  }

  return (initialResult.data ?? []) as PortalAccessProgrammeRow[];
}

async function loadProgrammeIdsWithClassesAtClub(
  clubId: string,
  programmeIds: string[],
): Promise<Set<string>> {
  if (programmeIds.length === 0) {
    return new Set();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("programme_id")
    .eq("club_id", clubId)
    .in("programme_id", programmeIds);

  if (error) {
    throw new Error(`Failed to load programme classes: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as { programme_id: string | null }[])
      .map((row) => row.programme_id)
      .filter((programmeId): programmeId is string => Boolean(programmeId)),
  );
}

function mapPortalAccessProgrammeRow(
  row: PortalAccessProgrammeRow,
): PortalAccessProgrammeItem {
  return {
    programmeId: row.id,
    name: row.name,
    programmeType: row.programme_type as StudentPortalAccessProgrammeType,
  };
}

function buildStudentAccessFormProgrammeCandidates(
  rows: PortalAccessProgrammeRow[],
  programmeIdsWithClasses: Set<string>,
) {
  return rows.map((row) => ({
    programmeType: row.programme_type as StudentPortalAccessProgrammeType,
    studentPortalAccessEnabled: row.student_portal_access_enabled,
    adminAreaEnabled: row.admin_area_enabled ?? row.programme_type === "bjj",
    hasClasses: programmeIdsWithClasses.has(row.id),
    createdAtMs: Date.parse(row.created_at),
  }));
}

/** All portal-access programme rows stored for the club (no auto-create). */
export async function loadPortalAccessProgrammeItems(
  clubId: string,
): Promise<PortalAccessProgrammeItem[]> {
  return (await loadPortalAccessProgrammeRows(clubId)).map(mapPortalAccessProgrammeRow);
}

/** Programmes the club actually operates — used for student access forms. */
export async function loadOperationalPortalAccessProgrammeItems(
  clubId: string,
): Promise<PortalAccessProgrammeItem[]> {
  const rows = await loadPortalAccessProgrammeRows(clubId);

  if (rows.length === 0) {
    return [];
  }

  const programmeIdsWithClasses = await loadProgrammeIdsWithClassesAtClub(
    clubId,
    rows.map((row) => row.id),
  );
  const operationalTypes = new Set(
    filterProgrammesForStudentAccessForms(
      buildStudentAccessFormProgrammeCandidates(rows, programmeIdsWithClasses),
    ),
  );

  return rows
    .filter((row) =>
      operationalTypes.has(row.programme_type as StudentPortalAccessProgrammeType),
    )
    .map(mapPortalAccessProgrammeRow);
}

/** Programme rows for Add Student — public.programmes only, no defaults or auto-create. */
export async function loadClubProgrammesForAddStudent(
  clubId: string,
  options?: { clubSlug?: string },
): Promise<AddStudentProgrammeRow[]> {
  noStore();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("id, name, slug, programme_type")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load club programmes: ${error.message}`);
  }

  const programmes = ((data ?? []) as {
    id: string;
    name: string;
    slug: string;
    programme_type: string;
  }[])
    .filter((row) => isStudentPortalAccessProgrammeType(row.programme_type))
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      programmeType: row.programme_type as StudentPortalAccessProgrammeType,
    }));

  console.log(
    "[AddStudent] programmes loaded from public.programmes",
    JSON.stringify({
      clubId,
      clubSlug: options?.clubSlug ?? null,
      programmeTypes: programmes.map((programme) => programme.programmeType),
      programmes,
    }),
  );

  return programmes;
}

/** Active member enrolment in any student-portal-access programme at the club (role-agnostic). */
export async function userHasActiveStudentPortalProgrammeMembershipAtClub(
  clubId: string,
  userId: string,
): Promise<boolean> {
  if (!(await isProgrammesSchemaAvailable())) {
    return false;
  }

  const accessProgrammes = await loadPortalAccessProgrammeItems(clubId);

  if (accessProgrammes.length === 0) {
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const programmeIds = accessProgrammes.map((programme) => programme.programmeId);
  const { data, error } = await supabase
    .from("programme_memberships")
    .select("programme_id")
    .eq("user_id", userId)
    .in("programme_id", programmeIds)
    .eq("status", "active")
    .limit(1);

  if (error) {
    throw new Error(
      `Failed to load student portal programme memberships: ${error.message}`,
    );
  }

  return (data ?? []).length > 0;
}

/** Clubs where one user has active portal-access programme membership (multi-club batch). */
export async function loadClubIdsWithActiveStudentPortalProgrammeMembershipForUser(
  userId: string,
  clubIds: string[],
): Promise<Set<string>> {
  const accessibleClubIds = new Set<string>();

  if (clubIds.length === 0 || !(await isProgrammesSchemaAvailable())) {
    return accessibleClubIds;
  }

  const programmeIdsByClubId = new Map<string, string[]>();
  const allProgrammeIds = new Set<string>();

  await Promise.all(
    clubIds.map(async (clubId) => {
      const accessProgrammes = await loadPortalAccessProgrammeItems(clubId);
      const programmeIds = accessProgrammes.map((programme) => programme.programmeId);

      if (programmeIds.length === 0) {
        return;
      }

      programmeIdsByClubId.set(clubId, programmeIds);

      for (const programmeId of programmeIds) {
        allProgrammeIds.add(programmeId);
      }
    }),
  );

  if (allProgrammeIds.size === 0) {
    return accessibleClubIds;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programme_memberships")
    .select("programme_id")
    .eq("user_id", userId)
    .in("programme_id", Array.from(allProgrammeIds))
    .eq("status", "active");

  if (error) {
    throw new Error(
      `Failed to load student portal programme memberships: ${error.message}`,
    );
  }

  const activeProgrammeIds = new Set(
    ((data ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
  );

  for (const [clubId, programmeIds] of Array.from(programmeIdsByClubId.entries())) {
    if (programmeIds.some((programmeId) => activeProgrammeIds.has(programmeId))) {
      accessibleClubIds.add(clubId);
    }
  }

  return accessibleClubIds;
}

/** Batch variant for admin portal messaging recipient lists. */
export async function loadUserIdsWithActiveStudentPortalProgrammeMembershipAtClub(
  clubId: string,
  userIds: string[],
): Promise<Set<string>> {
  const result = new Set<string>();

  if (!(await isProgrammesSchemaAvailable()) || userIds.length === 0) {
    return result;
  }

  const accessProgrammes = await loadPortalAccessProgrammeItems(clubId);

  if (accessProgrammes.length === 0) {
    return result;
  }

  const supabase = getSupabaseAdminClient();
  const programmeIds = accessProgrammes.map((programme) => programme.programmeId);
  const batchSize = 100;

  for (let index = 0; index < userIds.length; index += batchSize) {
    const batch = userIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("programme_memberships")
      .select("user_id")
      .in("user_id", batch)
      .in("programme_id", programmeIds)
      .eq("status", "active");

    if (error) {
      throw new Error(
        `Failed to load student portal programme memberships: ${error.message}`,
      );
    }

    for (const row of (data ?? []) as { user_id: string }[]) {
      if (row.user_id) {
        result.add(row.user_id);
      }
    }
  }

  return result;
}

export async function setProgrammeBookingAccessForUser(input: {
  clubId: string;
  userId: string;
  programmeTypes: ProgrammeTypeValue[];
}) {
  if (!(await isProgrammeBookingAccessSchemaAvailable())) {
    return;
  }

  await ensureStudentPortalAccessProgrammeRows(input.clubId, input.programmeTypes);

  const supabase = getSupabaseAdminClient();
  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", input.clubId)
    .in("programme_type", input.programmeTypes);

  if (programmesError) {
    throw new Error(`Failed to load programmes for booking access: ${programmesError.message}`);
  }

  await syncProgrammeBookingAccessForUser({
    clubId: input.clubId,
    userId: input.userId,
    programmeIds: ((programmes ?? []) as { id: string }[]).map((programme) => programme.id),
  });
}

export async function ensureProgrammeBookingAccessForUser(input: {
  clubId: string;
  userId: string;
  programmeTypes?: ProgrammeTypeValue[];
}) {
  if (!(await isProgrammeBookingAccessSchemaAvailable())) {
    return;
  }

  const programmeTypes = input.programmeTypes ?? STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST;
  const supabase = getSupabaseAdminClient();

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", input.clubId)
    .in("programme_type", programmeTypes);

  if (programmesError) {
    throw new Error(`Failed to load programmes for booking access: ${programmesError.message}`);
  }

  const rows = ((programmes ?? []) as { id: string }[]).map((programme) => ({
    programme_id: programme.id,
    user_id: input.userId,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("programme_booking_access").upsert(rows, {
    onConflict: "programme_id,user_id",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(`Failed to grant programme booking access: ${error.message}`);
  }
}

async function syncProgrammeBookingAccessForUser(input: {
  clubId: string;
  userId: string;
  programmeIds: string[];
}) {
  if (!(await isProgrammeBookingAccessSchemaAvailable())) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const accessProgrammes = await loadOperationalPortalAccessProgrammeItems(input.clubId);
  const accessProgrammeIds = new Set(
    accessProgrammes.map((programme) => programme.programmeId),
  );
  const selectedSet = new Set(input.programmeIds);

  const { data: existingRows, error: existingError } = await supabase
    .from("programme_booking_access")
    .select("programme_id")
    .eq("user_id", input.userId)
    .in("programme_id", Array.from(accessProgrammeIds));

  if (existingError) {
    throw new Error(`Failed to load programme booking access: ${existingError.message}`);
  }

  const existingProgrammeIds = new Set(
    ((existingRows ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
  );
  const toAdd = input.programmeIds.filter(
    (programmeId) => !existingProgrammeIds.has(programmeId),
  );
  const toRemove = Array.from(existingProgrammeIds).filter(
    (programmeId) => !selectedSet.has(programmeId),
  );

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("programme_booking_access").upsert(
      toAdd.map((programmeId) => ({
        programme_id: programmeId,
        user_id: input.userId,
      })),
      { onConflict: "programme_id,user_id" },
    );

    if (insertError) {
      throw new Error(`Failed to add programme booking access: ${insertError.message}`);
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("programme_booking_access")
      .delete()
      .eq("user_id", input.userId)
      .in("programme_id", toRemove);

    if (deleteError) {
      throw new Error(`Failed to remove programme booking access: ${deleteError.message}`);
    }
  }
}

export async function ensureProgrammeMembershipForUser(input: {
  clubId: string;
  userId: string;
  programmeTypes: ProgrammeTypeValue[];
  status?: string;
}) {
  if (!(await isProgrammesSchemaAvailable())) {
    return;
  }

  await ensureStudentPortalAccessProgrammeRows(input.clubId, input.programmeTypes);

  const supabase = getSupabaseAdminClient();
  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id, programme_type")
    .eq("club_id", input.clubId)
    .in("programme_type", input.programmeTypes);

  if (programmesError) {
    throw new Error(
      `Failed to load programmes for student area membership: ${programmesError.message}`,
    );
  }

  for (const programme of (programmes ?? []) as { id: string }[]) {
    await ensureProgrammeMembership({
      programmeId: programme.id,
      userId: input.userId,
      status: input.status,
    });
  }
}

/** @deprecated Use ensureProgrammeMembershipForUser and ensureProgrammeBookingAccessForUser separately. */
export async function ensureProgrammeAccessForUser(input: {
  clubId: string;
  userId: string;
  programmeTypes: ProgrammeTypeValue[];
  status?: string;
}) {
  await ensureProgrammeMembershipForUser(input);
  await ensureProgrammeBookingAccessForUser({
    clubId: input.clubId,
    userId: input.userId,
    programmeTypes: input.programmeTypes,
  });
}

export async function loadStudentProgrammeBookingAccessForProfile(
  clubId: string,
  userId: string,
): Promise<AdminStudentProgrammeAccessSummary> {
  if (!(await isProgrammesSchemaAvailable())) {
    return { available: false, programmes: [] };
  }

  const accessProgrammes = await loadOperationalPortalAccessProgrammeItems(clubId);

  if (accessProgrammes.length === 0) {
    return { available: true, programmes: [] };
  }

  if (!(await isProgrammeBookingAccessSchemaAvailable())) {
    return loadStudentProgrammeAccessForProfile(clubId, userId);
  }

  const supabase = getSupabaseAdminClient();
  const { data: bookingRows, error: bookingError } = await supabase
    .from("programme_booking_access")
    .select("programme_id")
    .eq("user_id", userId)
    .in(
      "programme_id",
      accessProgrammes.map((programme) => programme.programmeId),
    );

  if (bookingError) {
    throw new Error(`Failed to load programme booking access: ${bookingError.message}`);
  }

  const bookingProgrammeIds = new Set(
    ((bookingRows ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
  );

  return {
    available: true,
    programmes: accessProgrammes.map((programme) => ({
      programmeId: programme.programmeId,
      name: programme.name,
      hasAccess: bookingProgrammeIds.has(programme.programmeId),
    })),
  };
}

/** @deprecated Use loadStudentProgrammeMembershipForProfile for student areas. */
export async function loadStudentProgrammeAccessForProfile(
  clubId: string,
  userId: string,
): Promise<AdminStudentProgrammeAccessSummary> {
  return loadStudentProgrammeMembershipForProfile(clubId, userId).then(
    (membership) => ({
      available: membership.available,
      programmes: membership.programmes.map((programme) => ({
        programmeId: programme.programmeId,
        name: programme.name,
        hasAccess: programme.isMember,
      })),
    }),
  );
}

export async function loadStudentProgrammeMembershipForProfile(
  clubId: string,
  userId: string,
): Promise<AdminStudentProgrammeMembershipSummary> {
  if (!(await isProgrammesSchemaAvailable())) {
    return { available: false, programmes: [] };
  }

  const accessProgrammes = await loadOperationalPortalAccessProgrammeItems(clubId);

  if (accessProgrammes.length === 0) {
    return { available: true, programmes: [] };
  }

  const supabase = getSupabaseAdminClient();
  const { data: membershipRows, error: membershipsError } = await supabase
    .from("programme_memberships")
    .select("programme_id, status")
    .eq("user_id", userId)
    .in(
      "programme_id",
      accessProgrammes.map((programme) => programme.programmeId),
    );

  if (membershipsError) {
    throw new Error(`Failed to load programme memberships: ${membershipsError.message}`);
  }

  const activeProgrammeIds = new Set(
    ((membershipRows ?? []) as { programme_id: string; status: string }[])
      .filter((row) => row.status === "active")
      .map((row) => row.programme_id),
  );

  return {
    available: true,
    programmes: accessProgrammes.map((programme) => ({
      programmeId: programme.programmeId,
      name: programme.name,
      programmeType: programme.programmeType,
      isMember: activeProgrammeIds.has(programme.programmeId),
    })),
  };
}

export async function updateStudentProgrammeBookingAccess(input: {
  clubId: string;
  userId: string;
  programmeIds: string[];
}) {
  if (!(await isProgrammesSchemaAvailable())) {
    throw new Error(PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE);
  }

  const selectedProgrammeIds = Array.from(new Set(input.programmeIds));
  const accessProgrammes = await loadOperationalPortalAccessProgrammeItems(input.clubId);
  const accessProgrammeIds = new Set(
    accessProgrammes.map((programme) => programme.programmeId),
  );

  for (const programmeId of selectedProgrammeIds) {
    if (!accessProgrammeIds.has(programmeId)) {
      throw new Error("One or more selected programmes are invalid for this club.");
    }
  }

  await syncProgrammeBookingAccessForUser({
    clubId: input.clubId,
    userId: input.userId,
    programmeIds: selectedProgrammeIds,
  });
}

export async function updateStudentProgrammeMemberships(input: {
  clubId: string;
  userId: string;
  programmeIds: string[];
}) {
  if (!(await isProgrammesSchemaAvailable())) {
    throw new Error(PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE);
  }

  const supabase = getSupabaseAdminClient();
  const selectedProgrammeIds = Array.from(new Set(input.programmeIds));
  const accessProgrammes = await loadOperationalPortalAccessProgrammeItems(input.clubId);
  const accessProgrammeIds = new Set(
    accessProgrammes.map((programme) => programme.programmeId),
  );

  for (const programmeId of selectedProgrammeIds) {
    if (!accessProgrammeIds.has(programmeId)) {
      throw new Error("One or more selected programmes are invalid for this club.");
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("programme_memberships")
    .select("programme_id")
    .eq("user_id", input.userId)
    .in("programme_id", Array.from(accessProgrammeIds));

  if (existingError) {
    throw new Error(`Failed to load programme memberships: ${existingError.message}`);
  }

  const existingProgrammeIds = new Set(
    ((existingRows ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
  );
  const selectedSet = new Set(selectedProgrammeIds);
  const toAdd = selectedProgrammeIds.filter((programmeId) => !existingProgrammeIds.has(programmeId));
  const toRemove = Array.from(existingProgrammeIds).filter(
    (programmeId) => !selectedSet.has(programmeId),
  );
  const toReactivate = selectedProgrammeIds.filter((programmeId) =>
    existingProgrammeIds.has(programmeId),
  );

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("programme_memberships").upsert(
      toAdd.map((programmeId) => ({
        programme_id: programmeId,
        user_id: input.userId,
        status: "active",
        joined_at: todayDateKey(),
      })),
      { onConflict: "programme_id,user_id" },
    );

    if (insertError) {
      throw new Error(`Failed to add programme memberships: ${insertError.message}`);
    }
  }

  if (toReactivate.length > 0) {
    const { error: reactivateError } = await supabase
      .from("programme_memberships")
      .update({ status: "active" })
      .eq("user_id", input.userId)
      .in("programme_id", toReactivate);

    if (reactivateError) {
      throw new Error(`Failed to update programme memberships: ${reactivateError.message}`);
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("programme_memberships")
      .delete()
      .eq("user_id", input.userId)
      .in("programme_id", toRemove);

    if (deleteError) {
      throw new Error(`Failed to remove programme memberships: ${deleteError.message}`);
    }
  }
}

/** User ids eligible for admin booking pickers (matches student portal booking access rules). */
export async function loadEligibleBookingStudentUserIds(
  clubId: string,
  options?: { programmeType?: ProgrammeType },
): Promise<string[]> {
  const membershipRows = await loadClubMembershipRows(clubId);
  const activeMemberIds = new Set(
    membershipRows
      .filter((membership) => isActiveMembershipStatus(membership.status))
      .map((membership) => membership.user_id),
  );

  if (activeMemberIds.size === 0) {
    return [];
  }

  if (!(await isProgrammesSchemaAvailable())) {
    return membershipRows
      .filter(isActiveStudentClubMembership)
      .map((membership) => membership.user_id);
  }

  const supabase = getSupabaseAdminClient();
  let programmesQuery = supabase.from("programmes").select("id").eq("club_id", clubId);

  if (options?.programmeType) {
    programmesQuery = programmesQuery.eq("programme_type", options.programmeType);
  } else {
    programmesQuery = programmesQuery.in(
      "programme_type",
      STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST,
    );
  }

  const { data: programmes, error: programmesError } = await programmesQuery;

  if (programmesError) {
    throw new Error(`Failed to load club programmes: ${programmesError.message}`);
  }

  const programmeIds = ((programmes ?? []) as { id: string }[]).map((row) => row.id);
  const eligibleUserIds = new Set<string>();

  if (programmeIds.length === 0) {
    return membershipRows
      .filter(isActiveStudentClubMembership)
      .map((membership) => membership.user_id);
  }

  if (await isProgrammeBookingAccessSchemaAvailable()) {
    const { data, error } = await supabase
      .from("programme_booking_access")
      .select("user_id")
      .in("programme_id", programmeIds);

    if (error) {
      throw new Error(`Failed to load student booking access: ${error.message}`);
    }

    for (const row of (data ?? []) as { user_id: string }[]) {
      if (activeMemberIds.has(row.user_id)) {
        eligibleUserIds.add(row.user_id);
      }
    }
  } else {
    const { data, error } = await supabase
      .from("programme_memberships")
      .select("user_id")
      .in("programme_id", programmeIds)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to load student programme access: ${error.message}`);
    }

    for (const row of (data ?? []) as { user_id: string }[]) {
      if (activeMemberIds.has(row.user_id)) {
        eligibleUserIds.add(row.user_id);
      }
    }
  }

  for (const membership of membershipRows) {
    if (isActiveStudentClubMembership(membership)) {
      eligibleUserIds.add(membership.user_id);
    }
  }

  return Array.from(eligibleUserIds);
}

/** Admin booking submit check — must match loadEligibleBookingStudentUserIds picker rules. */
export async function assertStudentEligibleForAdminProgrammeBooking(
  userId: string,
  clubId: string,
  programmeType: ProgrammeType,
) {
  const eligibleUserIds = await loadEligibleBookingStudentUserIds(clubId, {
    programmeType,
  });

  if (!eligibleUserIds.includes(userId)) {
    throw new Error(
      "Selected student is not eligible to book classes for this programme.",
    );
  }
}

/** Active programme IDs for student portal booking; null when programmes schema is unavailable. */
export async function loadStudentActiveProgrammeIdsForBooking(
  userId: string,
  clubId: string,
): Promise<Set<string> | null> {
  if (!(await isProgrammesSchemaAvailable())) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  const { data: accessProgrammes, error: programmesError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId)
    .in("programme_type", STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES_LIST);

  if (programmesError) {
    throw new Error(`Failed to load club programmes: ${programmesError.message}`);
  }

  const clubProgrammeIds = ((accessProgrammes ?? []) as { id: string }[]).map(
    (row) => row.id,
  );

  if (clubProgrammeIds.length === 0) {
    return new Set();
  }

  if (await isProgrammeBookingAccessSchemaAvailable()) {
    const { data, error } = await supabase
      .from("programme_booking_access")
      .select("programme_id")
      .eq("user_id", userId)
      .in("programme_id", clubProgrammeIds);

    if (error) {
      throw new Error(`Failed to load student booking access: ${error.message}`);
    }

    return new Set(
      ((data ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
    );
  }

  const { data, error } = await supabase
    .from("programme_memberships")
    .select("programme_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("programme_id", clubProgrammeIds);

  if (error) {
    throw new Error(`Failed to load student programme access: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as { programme_id: string }[]).map((row) => row.programme_id),
  );
}

export async function assertStudentCanBookClassProgramme(input: {
  userId: string;
  clubId: string;
  classId: string;
}) {
  const allowedProgrammeIds = await loadStudentActiveProgrammeIdsForBooking(
    input.userId,
    input.clubId,
  );

  if (!allowedProgrammeIds) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("programme_id, club_id")
    .eq("id", input.classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class programme: ${error.message}`);
  }

  if (!data || data.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  const programmeId = (data as { programme_id: string | null }).programme_id;

  if (!programmeId) {
    return;
  }

  if (!allowedProgrammeIds.has(programmeId)) {
    throw new Error("This class is not available for your programme booking access.");
  }
}
