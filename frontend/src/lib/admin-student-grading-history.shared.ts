import type { AdminStudentProfileGradeHistoryEntry } from "@/lib/admin-student-profile.shared";
import type { BeltLevelOption } from "@/lib/admin-belt-levels.shared";

export interface AdminStudentGradingHistoryPageData {
  userId: string;
  studentName: string;
  currentBeltLabel: string;
  currentBeltAwardedAt: string | null;
  gradeHistory: AdminStudentProfileGradeHistoryEntry[];
  gradingBeltOptions: {
    adult: BeltLevelOption[];
    junior: BeltLevelOption[];
  };
}
