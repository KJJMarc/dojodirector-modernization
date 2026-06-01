import type { ReactNode } from "react";

/** Shared styling for admin breadcrumb / back navigation links. */
export const adminNavLinkClassName =
  "text-sm font-medium text-dojo-muted transition hover:text-dojo-white";

interface AdminNavLinksProps {
  children: ReactNode;
  className?: string;
}

/** Admin-portal only — flex row for back / breadcrumb links with consistent spacing. */
export function AdminNavLinks({
  children,
  className = "",
}: AdminNavLinksProps) {
  return (
    <nav
      aria-label="Admin navigation"
      className={`flex flex-wrap items-center gap-6 sm:gap-8 ${className}`.trim()}
    >
      {children}
    </nav>
  );
}
