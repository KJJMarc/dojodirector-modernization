import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface AdminInstructorClassesPageProps {
  searchParams: { instructorId?: string };
}

export default function AdminInstructorClassesPage({
  searchParams,
}: AdminInstructorClassesPageProps) {
  redirectLegacyClubAdmin("instructors/classes", searchParams);
}
