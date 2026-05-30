import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminNewClassPage() {
  redirectLegacyClubAdmin("classes/new");
}
