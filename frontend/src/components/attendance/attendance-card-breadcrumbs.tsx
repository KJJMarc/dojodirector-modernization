import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";

interface AttendanceCardBreadcrumbsProps {
  clubSlug: string;
  studentName: string;
  userId: string;
}

function BreadcrumbSeparator() {
  return (
    <span className="text-dojo-muted/60" aria-hidden>
      /
    </span>
  );
}

export function AttendanceCardBreadcrumbs({
  clubSlug,
  studentName,
  userId,
}: AttendanceCardBreadcrumbsProps) {
  const profileHref = clubAdminPath(clubSlug, `students/${userId}/profile`);
  const studentsHref = clubAdminPath(clubSlug, "students");
  const dashboardHref = clubAdminPath(clubSlug);

  return (
    <nav aria-label="Breadcrumb" className="print:hidden">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-snug">
        <li>
          <Link
            href={dashboardHref}
            className="font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            Admin Dashboard
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <BreadcrumbSeparator />
          <Link
            href={studentsHref}
            className="font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            Students
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <BreadcrumbSeparator />
          <Link
            href={profileHref}
            className="font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            {studentName}
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <BreadcrumbSeparator />
          <span className="font-medium text-dojo-white" aria-current="page">
            Attendance Card
          </span>
        </li>
      </ol>
    </nav>
  );
}
