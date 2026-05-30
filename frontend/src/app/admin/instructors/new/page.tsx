import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminAddInstructorPage() {
  redirectLegacyClubAdmin("instructors/new");
}
