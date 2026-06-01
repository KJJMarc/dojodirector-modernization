import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminBeltsPage() {
  redirectLegacyClubAdmin("belt-management");
}
