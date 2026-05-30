import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminAddStudentPage() {
  redirectLegacyClubAdmin("students/new");
}
