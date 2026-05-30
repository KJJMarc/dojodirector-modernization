import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminInstructorSessionsPage() {
  redirectLegacyClubAdmin("instructors/sessions");
}
