import Link from "next/link";

interface InstructorPortalBackLinkProps {
  label?: string;
}

export function InstructorPortalBackLink({
  label = "← Back to Instructor Portal",
}: InstructorPortalBackLinkProps) {
  return (
    <Link
      href="/instructor-portal"
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      {label}
    </Link>
  );
}
