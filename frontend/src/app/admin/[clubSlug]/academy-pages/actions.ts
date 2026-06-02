"use server";

import { revalidateStudentOfTheYearPaths } from "@/lib/admin-revalidate.server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { saveStudentOfTheYearAward } from "@/lib/student-of-the-year.server";

export async function saveStudentOfTheYearAwardAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const { club } = await requireAdminAccessForClubSlug(clubSlug);
  const year = Number(String(formData.get("year") ?? "").trim());
  const studentName = String(formData.get("studentName") ?? "");

  await saveStudentOfTheYearAward({
    clubId: club.id,
    year,
    studentName,
  });

  revalidateStudentOfTheYearPaths(clubSlug);
}
