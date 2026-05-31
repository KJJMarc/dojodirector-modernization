import Link from "next/link";

export function InstructorPortalHomeLink() {
  return (
    <Link
      href="/"
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      ← Back to Home
    </Link>
  );
}
