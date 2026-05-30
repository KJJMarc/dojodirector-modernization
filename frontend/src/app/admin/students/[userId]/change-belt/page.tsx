import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface AdminChangeBeltPageProps {
  params: { userId: string };
}

export default function AdminChangeBeltPage({
  params,
}: AdminChangeBeltPageProps) {
  redirectLegacyClubAdmin(`students/${params.userId}/change-belt`);
}
