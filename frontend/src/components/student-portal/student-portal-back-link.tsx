import Link from "next/link";

interface StudentPortalBackLinkProps {
  userId: string;
  label?: string;
}

export function StudentPortalBackLink({
  userId,
  label = "← Back to My Portal",
}: StudentPortalBackLinkProps) {
  return (
    <Link
      href="/student-portal"
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      {label}
    </Link>
  );
}
