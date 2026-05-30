import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface AdminStudentProfilePageProps {
  params: { userId: string };
}

export default function AdminStudentProfilePage({
  params,
}: AdminStudentProfilePageProps) {
  redirectLegacyClubAdmin(`students/${params.userId}/profile`);
}
