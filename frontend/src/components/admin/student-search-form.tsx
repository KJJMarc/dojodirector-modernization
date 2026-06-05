"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  AdminStudentSortDir,
  AdminStudentSortKey,
} from "@/lib/admin-students";
import {
  ANALYTICS_LEAD_SOURCES,
  formatAnalyticsLeadSourceLabel,
  type AnalyticsLeadSource,
} from "@/lib/lead-source-analytics.shared";

interface StudentSearchFormProps {
  clubSlug: string;
  initialQuery?: string;
  initialLeadSource?: AnalyticsLeadSource;
  sortKey: AdminStudentSortKey;
  sortDir: AdminStudentSortDir;
  studentsPath?: string;
  searchLabel?: string;
}

export function StudentSearchForm({
  clubSlug,
  initialQuery = "",
  initialLeadSource,
  sortKey,
  sortDir,
  studentsPath = "students",
  searchLabel = "Search BJJ students",
}: StudentSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [leadSource, setLeadSource] = useState(initialLeadSource ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();
    params.set("sort", sortKey);
    params.set("dir", sortDir);

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (leadSource) {
      params.set("source", leadSource);
    }

    router.push(`${clubAdminPath(clubSlug, studentsPath)}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="student-search">
          {searchLabel}
        </label>
        <input
          id="student-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by first name, last name, email or lead source"
          className="min-h-[40px] flex-1 rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
        />
        <button
          type="submit"
          className="min-h-[40px] rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover active:scale-[0.98]"
        >
          Search
        </button>
      </div>

      <div className="flex flex-col gap-1 sm:max-w-xs">
        <label
          htmlFor="student-lead-source-filter"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          Original lead source
        </label>
        <select
          id="student-lead-source-filter"
          value={leadSource}
          onChange={(event) => setLeadSource(event.target.value)}
          className="min-h-[40px] rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
        >
          <option value="">All sources</option>
          {ANALYTICS_LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {formatAnalyticsLeadSourceLabel(source)}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
