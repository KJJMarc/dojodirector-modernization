import "server-only";

import {
  canDeleteGradeAward,
  countRemainingGradeAwardsAfterDelete,
} from "@/lib/admin-grade-award.shared";
import {
  parseAwardedAtInput,
  validateAwardBeltLevelSelection,
} from "@/lib/admin-change-belt.shared";
import { loadBeltLevelsForClub } from "@/lib/admin-belt-promotion.server";
import {
  formatSupabaseErrorMessage,
  isSupabaseUniqueViolation,
  serializeSupabaseError,
} from "@/lib/supabase-error-logging.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  id: string;
  user_id: string;
  club_id: string;
  belt_level_id: string | null;
  awarded_at: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AdminUpdateGradeAwardResult =
  | { ok: true; alreadyApplied?: boolean }
  | { ok: false; message: string };

export type AdminDeleteGradeAwardResult =
  | { ok: true }
  | { ok: false; message: string };

interface GradeAwardOperationLogContext {
  operation: string;
  clubId: string;
  clubSlug?: string;
  userId?: string;
  studentEmail?: string | null;
  awardId: string;
  beltLevelId?: string;
  awardedAt?: string;
  notes?: string | null;
  supabaseError?: ReturnType<typeof serializeSupabaseError>;
  message?: string;
}

function logGradeAwardOperation(context: GradeAwardOperationLogContext) {
  console.error("[grade-award]", context);
}

async function loadStudentEmail(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.email;
}

async function loadGradeAwardById(awardId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select(
      "id, user_id, club_id, belt_level_id, awarded_at, notes, created_at, updated_at",
    )
    .eq("id", awardId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Failed to load grade award", error),
    );
  }

  if (!data) {
    throw new Error("Grade award not found.");
  }

  return data as GradeAwardRow;
}

async function loadGradeAwardForUser(awardId: string, userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select(
      "id, user_id, club_id, belt_level_id, awarded_at, notes, created_at, updated_at",
    )
    .eq("id", awardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Failed to load grade award", error),
    );
  }

  if (!data) {
    throw new Error("Grade award not found for this student.");
  }

  return data as GradeAwardRow;
}

async function loadGradeAwardsForUserInClub(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id")
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage(
        "Unable to verify remaining grade awards",
        error,
      ),
    );
  }

  return (data ?? []) as Array<{ id: string }>;
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

export async function assertNoDuplicateGradeAward(input: {
  userId: string;
  clubId: string;
  beltLevelId: string;
  awardedAt: string;
  exceptAwardId?: string;
}) {
  const parsedDate = parseAwardedAtInput(input.awardedAt);

  if (!parsedDate.ok) {
    throw new Error(parsedDate.failure.message);
  }

  const supabase = getSupabaseAdminClient();
  const awardedAt = input.awardedAt;

  let query = supabase
    .from("grade_awards")
    .select("id")
    .eq("user_id", input.userId)
    .eq("club_id", input.clubId)
    .eq("belt_level_id", input.beltLevelId)
    .eq("awarded_at", awardedAt);

  if (input.exceptAwardId) {
    query = query.neq("id", input.exceptAwardId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage(
        "Unable to verify existing grade awards",
        error,
      ),
    );
  }

  if ((data ?? []).length > 0) {
    throw new Error(
      "This student already has this belt level recorded for the selected date.",
    );
  }
}

async function updateGradeAwardRow(input: {
  awardId: string;
  clubId: string;
  beltLevelId: string;
  awardedAt: string;
  notes: string;
}) {
  const supabase = getSupabaseAdminClient();
  const payloadWithUpdatedAt = {
    belt_level_id: input.beltLevelId,
    awarded_at: input.awardedAt,
    notes: input.notes.length > 0 ? input.notes : null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("grade_awards")
    .update(payloadWithUpdatedAt)
    .eq("id", input.awardId)
    .eq("club_id", input.clubId);

  if (error?.message?.includes("updated_at")) {
    const fallback = await supabase
      .from("grade_awards")
      .update({
        belt_level_id: input.beltLevelId,
        awarded_at: input.awardedAt,
        notes: input.notes.length > 0 ? input.notes : null,
      })
      .eq("id", input.awardId)
      .eq("club_id", input.clubId);

    error = fallback.error;
  }

  return error;
}

export async function adminUpdateGradeAward(input: {
  awardId: string;
  clubId: string;
  clubSlug?: string;
  beltLevelId: string;
  awardedAt: string;
  notes?: string;
}): Promise<AdminUpdateGradeAwardResult> {
  try {
    const existingAward = await loadGradeAwardById(input.awardId, input.clubId);
    const studentEmail = await loadStudentEmail(existingAward.user_id);
    const notes = input.notes?.trim() ?? "";
    const parsedDate = parseAwardedAtInput(input.awardedAt);

    if (!parsedDate.ok) {
      logGradeAwardOperation({
        operation: "update_grade_award.validation",
        clubId: input.clubId,
        clubSlug: input.clubSlug,
        userId: existingAward.user_id,
        studentEmail,
        awardId: input.awardId,
        beltLevelId: input.beltLevelId,
        awardedAt: input.awardedAt,
        message: parsedDate.failure.message,
      });

      return { ok: false, message: parsedDate.failure.message };
    }

    const beltLevels = await loadBeltLevelsForClub(input.clubId);
    const selectedBelt =
      beltLevels.find((belt) => belt.id === input.beltLevelId) ?? null;
    const currentBelt =
      beltLevels.find((belt) => belt.id === existingAward.belt_level_id) ?? null;

    const validation = validateAwardBeltLevelSelection({
      selectedBelt,
      currentBelt,
    });

    if (!validation.ok) {
      logGradeAwardOperation({
        operation: "update_grade_award.validation",
        clubId: input.clubId,
        clubSlug: input.clubSlug,
        userId: existingAward.user_id,
        studentEmail,
        awardId: input.awardId,
        beltLevelId: input.beltLevelId,
        awardedAt: input.awardedAt,
        message: validation.failure.message,
      });

      return { ok: false, message: validation.failure.message };
    }

    if (
      existingAward.belt_level_id === input.beltLevelId &&
      existingAward.awarded_at === input.awardedAt &&
      (existingAward.notes ?? "") === notes
    ) {
      return { ok: true, alreadyApplied: true };
    }

    if (
      existingAward.belt_level_id === input.beltLevelId &&
      existingAward.awarded_at === input.awardedAt
    ) {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from("grade_awards")
        .update({
          notes: notes.length > 0 ? notes : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.awardId)
        .eq("club_id", input.clubId);

      if (error && !error.message.includes("updated_at")) {
        const message = formatSupabaseErrorMessage(
          "Unable to update grade award",
          error,
        );

        logGradeAwardOperation({
          operation: "update_grade_award.notes",
          clubId: input.clubId,
          clubSlug: input.clubSlug,
          userId: existingAward.user_id,
          studentEmail,
          awardId: input.awardId,
          beltLevelId: input.beltLevelId,
          awardedAt: input.awardedAt,
          notes,
          supabaseError: serializeSupabaseError(error),
          message,
        });

        return { ok: false, message };
      }

      if (error?.message.includes("updated_at")) {
        const fallback = await supabase
          .from("grade_awards")
          .update({
            notes: notes.length > 0 ? notes : null,
          })
          .eq("id", input.awardId)
          .eq("club_id", input.clubId);

        if (fallback.error) {
          const message = formatSupabaseErrorMessage(
            "Unable to update grade award",
            fallback.error,
          );

          logGradeAwardOperation({
            operation: "update_grade_award.notes",
            clubId: input.clubId,
            clubSlug: input.clubSlug,
            userId: existingAward.user_id,
            studentEmail,
            awardId: input.awardId,
            beltLevelId: input.beltLevelId,
            awardedAt: input.awardedAt,
            notes,
            supabaseError: serializeSupabaseError(fallback.error),
            message,
          });

          return { ok: false, message };
        }
      }

      return { ok: true };
    }

    try {
      await assertNoDuplicateGradeAward({
        userId: existingAward.user_id,
        clubId: input.clubId,
        beltLevelId: input.beltLevelId,
        awardedAt: input.awardedAt,
        exceptAwardId: input.awardId,
      });
    } catch (duplicateError) {
      const message =
        duplicateError instanceof Error
          ? duplicateError.message
          : "This student already has this belt level recorded for the selected date.";

      return { ok: false, message };
    }

    const error = await updateGradeAwardRow({
      awardId: input.awardId,
      clubId: input.clubId,
      beltLevelId: input.beltLevelId,
      awardedAt: input.awardedAt,
      notes,
    });

    if (error) {
      if (isSupabaseUniqueViolation(error)) {
        return { ok: true, alreadyApplied: true };
      }

      const message = formatSupabaseErrorMessage(
        "Unable to update grade award",
        error,
      );

      logGradeAwardOperation({
        operation: "update_grade_award.update",
        clubId: input.clubId,
        clubSlug: input.clubSlug,
        userId: existingAward.user_id,
        studentEmail,
        awardId: input.awardId,
        beltLevelId: input.beltLevelId,
        awardedAt: input.awardedAt,
        notes,
        supabaseError: serializeSupabaseError(error),
        message,
      });

      return { ok: false, message };
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update grade award. Please try again.";

    logGradeAwardOperation({
      operation: "update_grade_award.unhandled",
      clubId: input.clubId,
      clubSlug: input.clubSlug,
      awardId: input.awardId,
      beltLevelId: input.beltLevelId,
      awardedAt: input.awardedAt,
      message,
    });

    return { ok: false, message };
  }
}

export async function adminDeleteGradeAward(input: {
  awardId: string;
  userId: string;
  clubId: string;
  clubSlug?: string;
}): Promise<AdminDeleteGradeAwardResult> {
  try {
    const existingAward = await loadGradeAwardForUser(input.awardId, input.userId);
    const studentEmail = await loadStudentEmail(input.userId);

    if (existingAward.club_id !== input.clubId) {
      return {
        ok: false,
        message: "Grade award does not belong to this club.",
      };
    }

    await assertClubMember(input.userId, input.clubId);

    const awards = await loadGradeAwardsForUserInClub(
      input.userId,
      existingAward.club_id,
    );

    if (!canDeleteGradeAward(awards, input.awardId)) {
      return {
        ok: false,
        message:
          "Cannot delete the only grade award on record. Award a replacement belt first if needed.",
      };
    }

    const supabase = getSupabaseAdminClient();
    const { data: deletedRows, error } = await supabase
      .from("grade_awards")
      .delete()
      .eq("id", input.awardId)
      .eq("user_id", input.userId)
      .eq("club_id", existingAward.club_id)
      .select("id");

    if (error) {
      const message = formatSupabaseErrorMessage(
        "Unable to delete grade award",
        error,
      );

      logGradeAwardOperation({
        operation: "delete_grade_award.delete",
        clubId: input.clubId,
        clubSlug: input.clubSlug,
        userId: input.userId,
        studentEmail,
        awardId: input.awardId,
        supabaseError: serializeSupabaseError(error),
        message,
      });

      return { ok: false, message };
    }

    if (!deletedRows || deletedRows.length === 0) {
      return {
        ok: false,
        message: "Grade award could not be deleted.",
      };
    }

    const remainingCount = countRemainingGradeAwardsAfterDelete(
      awards,
      input.awardId,
    );

    if (remainingCount < 1) {
      return {
        ok: false,
        message: "Student has no remaining grade awards after deletion.",
      };
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete grade award. Please try again.";

    logGradeAwardOperation({
      operation: "delete_grade_award.unhandled",
      clubId: input.clubId,
      clubSlug: input.clubSlug,
      userId: input.userId,
      awardId: input.awardId,
      message,
    });

    return { ok: false, message };
  }
}
