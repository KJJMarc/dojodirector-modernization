import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminClassesPage() {
  redirectLegacyClubAdmin("classes");
}
