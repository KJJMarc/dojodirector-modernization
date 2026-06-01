import Link from "next/link";
import { adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { clubAdminPath } from "@/lib/clubs.shared";

interface AdminBackLinkProps {
  clubSlug: string;
  className?: string;
}

/** Admin-portal only — routes back to the club admin dashboard. */
export function AdminBackLink({
  clubSlug,
  className = adminNavLinkClassName,
}: AdminBackLinkProps) {
  return (
    <Link href={clubAdminPath(clubSlug)} className={className}>
      ← Back to Admin Dashboard
    </Link>
  );
}
