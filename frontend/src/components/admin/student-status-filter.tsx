import Link from "next/link";
import {
  ADMIN_STUDENT_LIST_STATUS_FILTER_OPTIONS,
  AdminStudentListStatusFilter,
  AdminStudentSort,
  buildAdminStudentsListHref,
} from "@/lib/admin-students";

interface StudentStatusFilterProps {
  clubSlug: string;
  currentFilter: AdminStudentListStatusFilter;
  currentSort: AdminStudentSort;
  searchQuery?: string;
  studentsPath?: string;
}

const TAB_CLASS =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border px-3 py-1.5 text-sm font-semibold transition";
const ACTIVE_TAB_CLASS =
  "border-dojo-red/60 bg-dojo-red/15 text-dojo-white";
const INACTIVE_TAB_CLASS =
  "border-dojo-border bg-dojo-elevated text-dojo-muted hover:border-dojo-red/40 hover:text-dojo-white";

export function StudentStatusFilter({
  clubSlug,
  currentFilter,
  currentSort,
  searchQuery,
  studentsPath = "students",
}: StudentStatusFilterProps) {
  return (
    <nav
      aria-label="Filter students by membership status"
      className="flex flex-wrap gap-2"
    >
      {ADMIN_STUDENT_LIST_STATUS_FILTER_OPTIONS.map((option) => {
        const isActive = currentFilter === option.value;
        const href = buildAdminStudentsListHref({
          clubSlug,
          sort: currentSort.key,
          dir: currentSort.dir,
          searchQuery,
          studentsPath,
          statusFilter: option.value,
        });

        return (
          <Link
            key={option.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`${TAB_CLASS} ${isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS}`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
