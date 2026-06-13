import "server-only";

import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { createMembershipAgreementPdfSignedUrl } from "@/lib/student-agreement-storage.server";
import { getMembershipAgreementPdfPathForUser } from "@/lib/student-portal-agreements.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function assertStudentHasMembershipAtClub(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

export async function resolveAdminMembershipAgreementPdfSignedUrl(
  clubSlug: string,
  userId: string,
): Promise<string> {
  const { club } = await requireAdminAccessForClubSlug(clubSlug);

  await assertStudentHasMembershipAtClub(userId, club.id);

  const pdfPath = await getMembershipAgreementPdfPathForUser(userId);

  if (!pdfPath) {
    throw new Error("No stored membership agreement PDF for this student.");
  }

  return createMembershipAgreementPdfSignedUrl(pdfPath);
}
