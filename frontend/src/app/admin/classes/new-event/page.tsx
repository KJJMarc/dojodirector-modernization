import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

export default function AdminNewEventPage() {
  redirectLegacyClubAdmin("classes/new-event");
}
