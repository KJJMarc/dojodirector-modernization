import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminInstructorsPage() {
  redirectLegacyClubAdmin("instructors");
}
