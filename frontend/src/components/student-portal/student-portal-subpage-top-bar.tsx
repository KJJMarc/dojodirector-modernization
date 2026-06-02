import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";

interface StudentPortalSubpageTopBarProps {
  clubSlug: string;
  userId: string;
}

export function StudentPortalSubpageTopBar({
  clubSlug,
  userId,
}: StudentPortalSubpageTopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <StudentPortalBackLink clubSlug={clubSlug} userId={userId} />
      <StudentPortalSignOutButton />
    </div>
  );
}
