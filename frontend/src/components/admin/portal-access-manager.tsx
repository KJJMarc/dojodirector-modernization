"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  searchPortalAccessMembersAction,
  sendPortalAccessEmailAction,
} from "@/app/admin/[clubSlug]/messaging/portal-access/actions";
import { PortalAccessEligibleReview } from "@/components/admin/portal-access-eligible-review";
import { PortalAccessMemberDetails } from "@/components/admin/portal-access-member-details";
import type { PortalAccessMemberSummary } from "@/lib/portal-access.shared";

interface PortalAccessManagerProps {
  clubSlug: string;
  eligibleCount: number;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

export function PortalAccessManager({
  clubSlug,
  eligibleCount,
}: PortalAccessManagerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PortalAccessMemberSummary[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [individualMessage, setIndividualMessage] = useState<string | null>(null);
  const [individualError, setIndividualError] = useState<string | null>(null);
  const [isSearchPending, startSearchTransition] = useTransition();
  const [isIndividualPending, startIndividualTransition] = useTransition();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchMessage(null);
    setIndividualMessage(null);
    setIndividualError(null);

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setSearchMessage("Enter a name or email to search.");
      return;
    }

    startSearchTransition(async () => {
      try {
        const response = await searchPortalAccessMembersAction(clubSlug, trimmedQuery);
        setResults(response.members);

        if (response.members.length === 0) {
          setSearchMessage("No matching active members at this academy.");
        }
      } catch (error) {
        setResults([]);
        setSearchMessage(
          error instanceof Error ? error.message : "Unable to search members.",
        );
      }
    });
  }

  function handleSendIndividual(userId: string) {
    setIndividualMessage(null);
    setIndividualError(null);

    startIndividualTransition(async () => {
      try {
        const result = await sendPortalAccessEmailAction(clubSlug, userId);
        setIndividualMessage(result.message);
      } catch (error) {
        setIndividualError(
          error instanceof Error
            ? error.message
            : "Unable to send portal access email.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">Individual invite</h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Search active members at this academy by name or email.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="portal-access-search">
            Search members
          </label>
          <input
            id="portal-access-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by first name, last name or email"
            className={inputClassName}
          />
          <button
            type="submit"
            disabled={isSearchPending}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearchPending ? "Searching…" : "Search"}
          </button>
        </form>

        {searchMessage ? (
          <p className="text-sm text-dojo-muted">{searchMessage}</p>
        ) : null}

        {individualMessage ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
            {individualMessage}
          </p>
        ) : null}

        {individualError ? (
          <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
            {individualError}
          </p>
        ) : null}

        {results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((member) => (
              <li
                key={member.userId}
                className="rounded-lg border border-dojo-border bg-dojo-elevated/60 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <PortalAccessMemberDetails member={member} />
                  <button
                    type="button"
                    disabled={!member.canSendSetupEmail || isIndividualPending}
                    onClick={() => handleSendIndividual(member.userId)}
                    className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send portal access email
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <PortalAccessEligibleReview clubSlug={clubSlug} eligibleCount={eligibleCount} />
    </div>
  );
}
