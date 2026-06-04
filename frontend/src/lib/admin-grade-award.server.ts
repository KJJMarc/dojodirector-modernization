import "server-only";

import {
  canDeleteGradeAward,
  countRemainingGradeAwardsAfterDelete,
} from "@/lib/admin-grade-award.shared";
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

function parseAwardedAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Awarded date must use YYYY-MM-DD format.");
  }

  return value;
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
    throw new Error(`Failed to load grade award: ${error.message}`);
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
    throw new Error(`Failed to load grade award: ${error.message}`);
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
      `Unable to verify remaining grade awards: ${error.message}`,
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
    throw new Error(`Unable to verify membership: ${error.message}`);
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
  const supabase = getSupabaseAdminClient();
  const awardedAt = parseAwardedAt(input.awardedAt);

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
    throw new Error(`Unable to verify existing grade awards: ${error.message}`);
  }

  if ((data ?? []).length > 0) {
    throw new Error(
      "This student already has this belt level recorded for the selected date.",
    );
  }
}

export async function adminUpdateGradeAward(input: {
  awardId: string;
  clubId: string;
  beltLevelId: string;
  awardedAt: string;
  notes?: string;
}) {
  const awardedAt = parseAwardedAt(input.awardedAt);
  const existingAward = await loadGradeAwardById(input.awardId, input.clubId);
  const notes = input.notes?.trim() ?? "";

  if (
    existingAward.belt_level_id === input.beltLevelId &&
    existingAward.awarded_at === awardedAt
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

    if (error) {
      throw new Error(`Unable to update grade award: ${error.message}`);
    }

    return;
  }

  await assertNoDuplicateGradeAward({
    userId: existingAward.user_id,
    clubId: input.clubId,
    beltLevelId: input.beltLevelId,
    awardedAt,
    exceptAwardId: input.awardId,
  });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("grade_awards")
    .update({
      belt_level_id: input.beltLevelId,
      awarded_at: awardedAt,
      notes: notes.length > 0 ? notes : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.awardId)
    .eq("club_id", input.clubId);

  if (error) {
    throw new Error(`Unable to update grade award: ${error.message}`);
  }
}

export async function adminDeleteGradeAward(input: {
  awardId: string;
  userId: string;
  clubId: string;
}) {
  const existingAward = await loadGradeAwardForUser(input.awardId, input.userId);

  if (existingAward.club_id !== input.clubId) {
    throw new Error("Grade award does not belong to this club.");
  }

  await assertClubMember(input.userId, input.clubId);

  const awards = await loadGradeAwardsForUserInClub(
    input.userId,
    existingAward.club_id,
  );

  if (!canDeleteGradeAward(awards, input.awardId)) {
    throw new Error(
      "Cannot delete the only grade award on record. Award a replacement belt first if needed.",
    );
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
    throw new Error(`Unable to delete grade award: ${error.message}`);
  }

  if (!deletedRows || deletedRows.length === 0) {
    throw new Error("Grade award could not be deleted.");
  }

  const remainingCount = countRemainingGradeAwardsAfterDelete(
    awards,
    input.awardId,
  );

  if (remainingCount < 1) {
    throw new Error("Student has no remaining grade awards after deletion.");
  }
}
