import Link from "next/link";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

interface InstructorPortalBackLinkProps {
  clubSlug: string;
  label?: string;
}

export function InstructorPortalBackLink({
  clubSlug,
  label = "← Back to Instructor Portal",
}: InstructorPortalBackLinkProps) {
  return (
    <Link
      href={instructorPortalClubPath(clubSlug)}
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      {label}
    </Link>
  );
}
