import Link from "next/link";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

interface StudentPortalBackLinkProps {
  clubSlug: string;
  userId: string;
  label?: string;
}

export function StudentPortalBackLink({
  clubSlug,
  userId,
  label = "← Back to My Portal",
}: StudentPortalBackLinkProps) {
  return (
    <Link
      href={studentPortalPath(clubSlug, userId)}
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      {label}
    </Link>
  );
}
