import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";

interface StudentPortalTopBarProps {
  clubSlug?: string;
  userId?: string;
  isPortalHome?: boolean;
}

export function StudentPortalTopBar({
  clubSlug,
  userId,
  isPortalHome = false,
}: StudentPortalTopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <StudentPortalHomeLink
        clubSlug={clubSlug}
        userId={userId}
        isPortalHome={isPortalHome}
      />
      <StudentPortalSignOutButton />
    </div>
  );
}
