"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  AdminStudentListStatusFilter,
  AdminStudentSortDir,
  AdminStudentSortKey,
  DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
} from "@/lib/admin-students";

interface StudentSearchFormProps {
  clubSlug: string;
  initialQuery?: string;
  sortKey: AdminStudentSortKey;
  sortDir: AdminStudentSortDir;
  statusFilter?: AdminStudentListStatusFilter;
  studentsPath?: string;
  searchLabel?: string;
}

export function StudentSearchForm({
  clubSlug,
  initialQuery = "",
  sortKey,
  sortDir,
  statusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
  studentsPath = "students",
  searchLabel = "Search BJJ students",
}: StudentSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();
    params.set("sort", sortKey);
    params.set("dir", sortDir);

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (statusFilter !== DEFAULT_ADMIN_STUDENT_STATUS_FILTER) {
      params.set("status", statusFilter);
    }

    router.push(`${clubAdminPath(clubSlug, studentsPath)}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="student-search">
        {searchLabel}
      </label>
      <input
        id="student-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by first name, last name or email"
        className="min-h-[40px] flex-1 rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
      />
      <button
        type="submit"
        className="min-h-[40px] rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover active:scale-[0.98]"
      >
        Search
      </button>
    </form>
  );
}
