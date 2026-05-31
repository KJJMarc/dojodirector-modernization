"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";

interface GuestBookingsSearchFormProps {
  clubSlug: string;
  initialQuery?: string;
}

export function GuestBookingsSearchForm({
  clubSlug,
  initialQuery = "",
}: GuestBookingsSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    router.push(`${clubAdminPath(clubSlug, "guest-bookings")}${suffix}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or email"
        className="min-h-[40px] flex-1 rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none focus:border-dojo-red"
      />
      <button
        type="submit"
        className="min-h-[40px] rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
      >
        Search
      </button>
    </form>
  );
}
