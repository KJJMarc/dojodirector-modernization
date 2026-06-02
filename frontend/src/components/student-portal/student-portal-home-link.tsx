import Link from "next/link";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

interface StudentPortalHomeLinkProps {
  clubSlug?: string;
  userId?: string;
}

export function StudentPortalHomeLink({ clubSlug, userId }: StudentPortalHomeLinkProps) {
  if (clubSlug && userId) {
    return (
      <Link
        href={studentPortalPath(clubSlug, userId)}
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
