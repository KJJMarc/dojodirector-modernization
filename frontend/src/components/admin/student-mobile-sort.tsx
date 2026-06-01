"use client";

import { useRouter } from "next/navigation";
import {
  AdminStudentSort,
  AdminStudentSortKey,
  buildAdminStudentsListHref,
} from "@/lib/admin-students";

interface StudentMobileSortProps {
  clubSlug: string;
  currentSort: AdminStudentSort;
  searchQuery?: string;
  studentsPath?: string;
  showBjjColumns?: boolean;
}

const SORT_OPTIONS: { key: AdminStudentSortKey; label: string }[] = [
  { key: "last_name", label: "Last name (A-Z)" },
  { key: "first_name", label: "First name (A-Z)" },
  { key: "email", label: "Email (A-Z)" },
  { key: "belt_level", label: "Belt level (low-high)" },
  { key: "attendances", label: "Attendances (low-high)" },
  { key: "role", label: "Role (A-Z)" },
];

function getMobileSortValue(sort: AdminStudentSort) {
  return `${sort.key}:${sort.dir}`;
}

function parseMobileSortValue(value: string): AdminStudentSort {
  const [key, dir] = value.split(":");

  return {
    key: (key as AdminStudentSortKey) ?? "last_name",
    dir: dir === "desc" ? "desc" : "asc",
  };
}

export function StudentMobileSort({
  clubSlug,
  currentSort,
  searchQuery,
  studentsPath = "students",
  showBjjColumns = true,
}: StudentMobileSortProps) {
  const router = useRouter();
  const sortOptions = SORT_OPTIONS.filter(({ key }) => {
    if (!showBjjColumns && (key === "belt_level" || key === "attendances")) {
      return false;
    }

    return true;
  });

  return (
    <div className="sm:hidden">
      <label
        htmlFor="student-mobile-sort"
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted"
      >
        Sort by
      </label>
      <select
        id="student-mobile-sort"
        value={getMobileSortValue(currentSort)}
        onChange={(event) => {
          const nextSort = parseMobileSortValue(event.target.value);
          router.push(
            buildAdminStudentsListHref({
              clubSlug,
              sort: nextSort.key,
              dir: nextSort.dir,
              searchQuery,
              studentsPath,
            }),
          );
        }}
        className="min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
      >
        {sortOptions.flatMap(({ key, label }) => [
          <option key={`${key}:asc`} value={`${key}:asc`}>
            {label}
          </option>,
          <option key={`${key}:desc`} value={`${key}:desc`}>
            {label.replace("(A-Z)", "(Z-A)").replace("(low-high)", "(high-low)")}
          </option>,
        ])}
      </select>
    </div>
  );
}
