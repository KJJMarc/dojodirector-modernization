"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";

interface PromotionCandidatesSearchFormProps {
  clubSlug: string;
  initialQuery?: string;
}

export function PromotionCandidatesSearchForm({
  clubSlug,
  initialQuery = "",
}: PromotionCandidatesSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    const queryString = params.toString();
    router.push(
      `${clubAdminPath(clubSlug, "students/promotion-candidates")}${
        queryString ? `?${queryString}` : ""
      }`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="promotion-candidate-search">
        Search promotion candidates
      </label>
      <input
        id="promotion-candidate-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or email"
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
