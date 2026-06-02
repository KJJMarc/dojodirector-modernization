import Link from "next/link";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

interface InstructorPortalHomeLinkProps {
  clubSlug?: string;
}

export function InstructorPortalHomeLink({ clubSlug }: InstructorPortalHomeLinkProps) {
  if (clubSlug) {
    return (
      <Link
        href={instructorPortalClubPath(clubSlug)}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Portal Home
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      ← Back to Home
    </Link>
  );
}
