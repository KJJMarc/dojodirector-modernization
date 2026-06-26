import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  sortAdultBeltLevels,
  sortBeltLevelsBySortOrder,
  toBeltLevelOptions,
  type BeltLevelOption,
} from "@/lib/admin-belt-levels.shared";
import {
  isAdultClubBeltLevel,
  isJuniorClubBeltLevel,
  parseAwardedAtInput,
  validateAwardBeltLevelSelection,
} from "@/lib/admin-change-belt.shared";
import { pickLatestGradeAwardForUser } from "@/lib/admin-belt-promotion.shared";
import { loadBeltLevelsForClub } from "@/lib/admin-belt-promotion.server";
import { assertNoDuplicateGradeAward } from "@/lib/admin-grade-award.server";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  formatSupabaseErrorMessage,
  isSupabaseUniqueViolation,
  serializeSupabaseError,
} from "@/lib/supabase-error-logging.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
  type?: string | null;
  belt_category?: string | null;
  is_active?: boolean | null;
}

interface GradeAwardRow {
  id: string;
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminChangeBeltPageData {
  userId: string;
  studentName: string;
  studentEmail: string | null;
  currentBeltLabel: string;
  currentBeltAwardedAt: string | null;
  adultBeltOptions: BeltLevelOption[];
  juniorBeltOptions: BeltLevelOption[];
}

export type AdminAwardBeltLevelResult =
  | { ok: true; alreadyApplied?: boolean }
  | { ok: false; message: string };

interface BeltGradeOperationLogContext {
  operation: string;
  clubId: string;
  clubSlug?: string;
  userId: string;
  studentEmail?: string | null;
  beltLevelId?: string;
  beltLabel?: string;
  awardedAt?: string;
  notes?: string | null;
  programmeContext?: Record<string, unknown>;
  supabaseError?: ReturnType<typeof serializeSupabaseError>;
  message?: string;
}

function logBeltGradeOperation(context: BeltGradeOperationLogContext) {
  console.error("[belt-grade]", context);
}

async function loadStudentProfile(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Failed to load student", error),
    );
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data;
}

async function loadProgrammeContextForStudent(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programme_memberships")
    .select("programme_id, status, programmes(name, slug, programme_type)")
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    return {
      loadError: serializeSupabaseError(error),
      memberships: [],
    };
  }

  return {
    loadError: null,
    memberships: (data ?? []).map((row) => {
      const programme = Array.isArray(row.programmes)
        ? row.programmes[0]
        : row.programmes;

      return {
        programmeId: row.programme_id,
        status: row.status,
        name: programme?.name ?? null,
        slug: programme?.slug ?? null,
        programmeType: programme?.programme_type ?? null,
      };
    }),
  };
}

async function assertClubMember(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Unable to verify membership", error),
    );
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

async function loadGradeAwardsForUser(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, user_id, belt_level_id, awarded_at, created_at, updated_at")
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Failed to load grade awards", error),
    );
  }

  return (data ?? []) as GradeAwardRow[];
}

function resolveBeltLevelById(
  beltLevels: BeltLevelRow[],
  beltLevelId: string | null | undefined,
) {
  if (!beltLevelId) {
    return null;
  }

  return beltLevels.find((belt) => belt.id === beltLevelId) ?? null;
}

async function loadClubBeltLevelOptions(clubId: string) {
  const beltLevels = await loadBeltLevelsForClub(clubId);
  const activeBelts = beltLevels.filter((belt) => belt.is_active !== false);
  const adultBelts = activeBelts.filter(isAdultClubBeltLevel);
  const juniorBelts = activeBelts.filter(isJuniorClubBeltLevel);

  return {
    adultBeltOptions: toBeltLevelOptions(sortAdultBeltLevels(adultBelts)),
    juniorBeltOptions: toBeltLevelOptions(sortBeltLevelsBySortOrder(juniorBelts)),
    beltLevels,
  };
}

export async function getAdminBeltLevelOptionsForClub(clubId: string) {
  const { adultBeltOptions, juniorBeltOptions } =
    await loadClubBeltLevelOptions(clubId);

  return {
    adultBeltOptions,
    juniorBeltOptions,
  };
}

export async function getAdminChangeBeltPageData(
  userId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminChangeBeltPageData> {
  await assertClubMember(userId, clubId);

  const [student, gradeAwards, beltOptions] = await Promise.all([
    loadStudentProfile(userId),
    loadGradeAwardsForUser(userId, clubId),
    loadClubBeltLevelOptions(clubId),
  ]);

  const latestAward = pickLatestGradeAwardForUser(
    userId,
    gradeAwards.map((award) => ({
      user_id: userId,
      belt_level_id: award.belt_level_id,
      awarded_at: award.awarded_at,
      id: award.id,
      created_at: award.created_at,
      updated_at: award.updated_at,
    })),
  );

  const currentBelt = resolveBeltLevelById(
    beltOptions.beltLevels,
    latestAward?.belt_level_id,
  );

  return {
    userId,
    studentName: getStudentFullName(student.first_name, student.last_name),
    studentEmail: student.email,
    currentBeltLabel: formatAdminBeltLabel(currentBelt),
    currentBeltAwardedAt: latestAward?.awarded_at ?? null,
    adultBeltOptions: beltOptions.adultBeltOptions,
    juniorBeltOptions: beltOptions.juniorBeltOptions,
  };
}

export async function adminAwardBeltLevel(input: {
  userId: string;
  beltLevelId: string;
  awardedAt: string;
  notes?: string;
  clubId?: string;
  clubSlug?: string;
}): Promise<AdminAwardBeltLevelResult> {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;
  const programmeContext = await loadProgrammeContextForStudent(
    input.userId,
    clubId,
  );

  let studentEmail: string | null = null;

  try {
    const student = await loadStudentProfile(input.userId);
    studentEmail = student.email;
    await assertClubMember(input.userId, clubId);

    const parsedDate = parseAwardedAtInput(input.awardedAt);

    if (!parsedDate.ok) {
      logBeltGradeOperation({
        operation: "award_belt_level.validation",
        clubId,
        clubSlug: input.clubSlug,
        userId: input.userId,
        studentEmail,
        beltLevelId: input.beltLevelId,
        awardedAt: input.awardedAt,
        programmeContext,
        message: parsedDate.failure.message,
      });

      return { ok: false, message: parsedDate.failure.message };
    }

    const awardedAt = input.awardedAt;
    const [beltLevels, gradeAwards] = await Promise.all([
      loadBeltLevelsForClub(clubId),
      loadGradeAwardsForUser(input.userId, clubId),
    ]);

    const selectedBelt = resolveBeltLevelById(beltLevels, input.beltLevelId);
    const latestAward = pickLatestGradeAwardForUser(
      input.userId,
      gradeAwards.map((award) => ({
        user_id: input.userId,
        belt_level_id: award.belt_level_id,
        awarded_at: award.awarded_at,
        id: award.id,
        created_at: award.created_at,
        updated_at: award.updated_at,
      })),
    );
    const currentBelt = resolveBeltLevelById(
      beltLevels,
      latestAward?.belt_level_id,
    );
    const validation = validateAwardBeltLevelSelection({
      selectedBelt,
      currentBelt,
    });

    if (!validation.ok) {
      logBeltGradeOperation({
        operation: "award_belt_level.validation",
        clubId,
        clubSlug: input.clubSlug,
        userId: input.userId,
        studentEmail,
        beltLevelId: input.beltLevelId,
        beltLabel: selectedBelt?.name,
        awardedAt,
        programmeContext,
        message: validation.failure.message,
      });

      return { ok: false, message: validation.failure.message };
    }

    const duplicateAward = gradeAwards.find(
      (award) =>
        award.belt_level_id === input.beltLevelId &&
        award.awarded_at === awardedAt,
    );

    if (duplicateAward) {
      return { ok: true, alreadyApplied: true };
    }

    try {
      await assertNoDuplicateGradeAward({
        userId: input.userId,
        clubId,
        beltLevelId: input.beltLevelId,
        awardedAt,
      });
    } catch (duplicateError) {
      const message =
        duplicateError instanceof Error
          ? duplicateError.message
          : "This student already has this belt level recorded for the selected date.";

      logBeltGradeOperation({
        operation: "award_belt_level.duplicate",
        clubId,
        clubSlug: input.clubSlug,
        userId: input.userId,
        studentEmail,
        beltLevelId: input.beltLevelId,
        beltLabel: selectedBelt?.name,
        awardedAt,
        programmeContext,
        message,
      });

      return { ok: false, message };
    }

    const notes = input.notes?.trim() ?? "";
    const supabase = getSupabaseAdminClient();
    const { error: insertError } = await supabase.from("grade_awards").insert({
      user_id: input.userId,
      club_id: clubId,
      belt_level_id: input.beltLevelId,
      awarded_at: awardedAt,
      notes: notes.length > 0 ? notes : null,
    });

    if (insertError) {
      if (isSupabaseUniqueViolation(insertError)) {
        return { ok: true, alreadyApplied: true };
      }

      const message = formatSupabaseErrorMessage(
        "Unable to award belt level",
        insertError,
      );

      logBeltGradeOperation({
        operation: "award_belt_level.insert",
        clubId,
        clubSlug: input.clubSlug,
        userId: input.userId,
        studentEmail,
        beltLevelId: input.beltLevelId,
        beltLabel: selectedBelt?.name,
        awardedAt,
        notes: notes || null,
        programmeContext,
        supabaseError: serializeSupabaseError(insertError),
        message,
      });

      return { ok: false, message };
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to award belt level. Please try again.";

    logBeltGradeOperation({
      operation: "award_belt_level.unhandled",
      clubId,
      clubSlug: input.clubSlug,
      userId: input.userId,
      studentEmail,
      beltLevelId: input.beltLevelId,
      awardedAt: input.awardedAt,
      programmeContext,
      message,
    });

    return { ok: false, message };
  }
}

// Re-export category helpers used by legacy callers/tests.
export { isAdultClubBeltLevel, isJuniorClubBeltLevel };
