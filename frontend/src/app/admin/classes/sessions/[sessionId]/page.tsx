import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface SessionBookingsPageProps {
  params: { sessionId: string };
}

export default function SessionBookingsPage({
  params,
}: SessionBookingsPageProps) {
  redirectLegacyClubAdmin(`classes/sessions/${params.sessionId}`);
}
