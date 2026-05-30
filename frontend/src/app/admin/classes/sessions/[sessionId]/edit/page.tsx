import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface EditClassSessionPageProps {
  params: { sessionId: string };
}

export default function EditClassSessionPage({
  params,
}: EditClassSessionPageProps) {
  redirectLegacyClubAdmin(`classes/sessions/${params.sessionId}/edit`);
}
