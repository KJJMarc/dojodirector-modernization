import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface AdminStudentsPageProps {
  searchParams: { q?: string; sort?: string; dir?: string };
}

export default function AdminStudentsPage({
  searchParams,
}: AdminStudentsPageProps) {
  redirectLegacyClubAdmin("students", searchParams);
}
