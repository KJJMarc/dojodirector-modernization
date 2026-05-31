import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import type {
  StudentPortalPreviewEntryData,
  StudentPortalPreviewStudent,
} from "@/lib/student-portal-preview.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { StudentPortalPreviewEntryData, StudentPortalPreviewStudent };

interface MembershipUserRow {
  user_id: string;
  users: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[] | null;
}

function mapPreviewStudent(
  user: MembershipUserRow["users"],
): StudentPortalPreviewStudent | null {
  if (!user) {
    return null;
  }

  const row = Array.isArray(user) ? user[0] : user;

  if (!row?.id) {
    return null;
  }

  return {
    id: row.id,
    fullName: getStudentFullName(row.first_name, row.last_name),
  };
}

function findFeaturedStudent(students: StudentPortalPreviewStudent[]) {
  const haroldLandry = students.find((student) => {
    const normalized = student.fullName.toLowerCase();
    return normalized.includes("harold") && normalized.includes("landry");
  });

  return haroldLandry ?? students[0] ?? null;
}

export async function getStudentPortalPreviewEntry(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<StudentPortalPreviewEntryData> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      user_id,
      users (
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq("club_id", clubId)
    .eq("role", "student")
    .order("user_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  const studentsById = new Map<string, StudentPortalPreviewStudent>();

  for (const row of (data ?? []) as unknown as MembershipUserRow[]) {
    const student = mapPreviewStudent(row.users);

    if (student) {
      studentsById.set(student.id, student);
    }
  }

  const students = Array.from(studentsById.values()).sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "en", { sensitivity: "base" }),
  );

  return {
    featuredStudent: findFeaturedStudent(students),
    students,
  };
}
