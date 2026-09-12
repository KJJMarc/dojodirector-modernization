"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  inactivateMembershipPaymentAction,
  markMembershipPaidAction,
  pauseMembershipPaymentAction,
  reactivateMembershipPaymentAction,
  resumeMembershipPaymentAction,
  unmarkMembershipPaidAction,
  updateMembershipPaidAtAction,
} from "@/app/admin/[clubSlug]/membership-payments/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  MEMBERSHIP_PAYMENT_LIST_FILTERS,
  MEMBERSHIP_PAYMENT_STATUS_LABELS,
  billingMonthLabel,
  clubMembershipPaymentsAdminPath,
  filterMembershipPaymentRows,
  formatDueDateLabel,
  shiftBillingMonth,
  type MembershipPaymentListFilter,
  type MembershipPaymentMemberRow,
  type MembershipPaymentMonthSummary,
  type MembershipPaymentYearRow,
  type MembershipMonthPaymentState,
} from "@/lib/membership-payments.shared";

interface MembershipPaymentsClientProps {
  clubSlug: string;
  billingMonth: string;
  currentBillingMonth: string;
  todayIso: string;
  year: number;
  initialView?: "month" | "year";
  summary: MembershipPaymentMonthSummary;
  rows: MembershipPaymentMemberRow[];
  yearRows: MembershipPaymentYearRow[];
}

const FILTER_LABELS: Record<MembershipPaymentListFilter, string> = {
  all: "All",
  active: "Active",
  paid: "Paid",
  overdue: "Overdue",
  paused: "Paused",
  inactive: "Inactive",
};

function monthHref(clubSlug: string, billingMonth: string, year: number, view: "month" | "year") {
  const params = new URLSearchParams({
    month: billingMonth.slice(0, 7),
    year: String(year),
    view,
  });
  return `${clubMembershipPaymentsAdminPath(clubSlug)}?${params.toString()}`;
}

function YearCell({ state }: { state: MembershipMonthPaymentState }) {
  if (state === "paid") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 text-sm font-semibold text-emerald-400">
        ✓
      </span>
    );
  }

  if (state === "awaiting") {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-dojo-amber-500/15 text-[10px] font-medium text-dojo-amber-500"
        title="Outstanding"
      >
        •
      </span>
    );
  }

  if (state === "overdue") {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-dojo-red/20 text-[10px] font-semibold text-dojo-red"
        title="Overdue"
      >
        !
      </span>
    );
  }

  if (state === "paused") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-dojo-elevated text-[10px] text-dojo-muted">
        P
      </span>
    );
  }

  if (state === "inactive") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-dojo-elevated text-[10px] text-dojo-muted">
        I
      </span>
    );
  }

  if (state === "future") {
    return <span className="inline-flex h-7 w-7 items-center justify-center text-dojo-muted/40">—</span>;
  }

  return <span className="inline-flex h-7 w-7 items-center justify-center text-dojo-muted/30">·</span>;
}

export function MembershipPaymentsClient({
  clubSlug,
  billingMonth,
  currentBillingMonth,
  todayIso,
  year,
  initialView = "month",
  summary,
  rows,
  yearRows,
}: MembershipPaymentsClientProps) {
  const [filter, setFilter] = useState<MembershipPaymentListFilter>("active");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"month" | "year">(initialView);
  const [paidAtDrafts, setPaidAtDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleRows = useMemo(
    () => filterMembershipPaymentRows(rows, filter, search),
    [rows, filter, search],
  );

  const runAction = (action: () => Promise<void>) => {
    setErrorMessage(null);
    startTransition(() => {
      void action().catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      });
    });
  };

  const previousMonth = shiftBillingMonth(billingMonth, -1);
  const nextMonth = shiftBillingMonth(billingMonth, 1);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Active members", value: summary.activeCount },
          { label: "Paid this month", value: summary.paidThisMonth },
          { label: "Awaiting payment", value: summary.awaitingPayment },
          { label: "Overdue", value: summary.overdueCount },
          { label: "Paused", value: summary.pausedCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-dojo-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-dojo-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Link
          href={monthHref(clubSlug, previousMonth, year, view)}
          className="rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white hover:border-dojo-red/50"
        >
          ← Prev
        </Link>
        <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white">
          {billingMonthLabel(billingMonth)}
        </div>
        <Link
          href={monthHref(clubSlug, nextMonth, year, view)}
          className="rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white hover:border-dojo-red/50"
        >
          Next →
        </Link>
        <Link
          href={monthHref(clubSlug, currentBillingMonth, year, view)}
          className="rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-muted hover:text-dojo-white"
        >
          Current month
        </Link>
        <label className="ml-auto flex items-center gap-2 text-sm text-dojo-muted">
          Month
          <input
            type="month"
            value={billingMonth.slice(0, 7)}
            onChange={(event) => {
              const value = event.target.value;
              if (value) {
                window.location.href = monthHref(
                  clubSlug,
                  `${value}-01`,
                  Number(value.slice(0, 4)),
                  view,
                );
              }
            }}
            className="rounded-md border border-dojo-border bg-dojo-surface px-2 py-1.5 text-dojo-white"
          />
        </label>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView("month")}
          className={`rounded-lg px-3 py-2 text-sm ${
            view === "month"
              ? "bg-dojo-red text-dojo-white"
              : "border border-dojo-border bg-dojo-surface text-dojo-muted"
          }`}
        >
          Month view
        </button>
        <button
          type="button"
          onClick={() => setView("year")}
          className={`rounded-lg px-3 py-2 text-sm ${
            view === "year"
              ? "bg-dojo-red text-dojo-white"
              : "border border-dojo-border bg-dojo-surface text-dojo-muted"
          }`}
        >
          Year view
        </button>
        {view === "year" ? (
          <div className="flex items-center gap-2">
            <Link
              href={monthHref(clubSlug, billingMonth, year - 1, "year")}
              className="rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white"
            >
              ← {year - 1}
            </Link>
            <span className="text-sm font-semibold text-dojo-white">{year}</span>
            <Link
              href={monthHref(clubSlug, billingMonth, year + 1, "year")}
              className="rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white"
            >
              {year + 1} →
            </Link>
          </div>
        ) : null}
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      {view === "month" ? (
        <>
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members"
              className="w-full rounded-lg border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              {MEMBERSHIP_PAYMENT_LIST_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    filter === item
                      ? "bg-dojo-red text-dojo-white"
                      : "border border-dojo-border bg-dojo-surface text-dojo-muted"
                  }`}
                >
                  {FILTER_LABELS[item]}
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-dojo-border bg-dojo-surface">
            <ul className="divide-y divide-dojo-border">
              {visibleRows.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-dojo-muted">
                  No members match this view.
                </li>
              ) : (
                visibleRows.map((member) => {
                  const isPaid = member.monthState === "paid";
                  const canMarkPaid =
                    member.monthState === "awaiting" || member.monthState === "overdue";
                  const dueLabel = formatDueDateLabel(member.dueDate);

                  return (
                    <li
                      key={member.memberId}
                      className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                        isPaid
                          ? "bg-emerald-500/10"
                          : member.monthState === "overdue"
                            ? "bg-dojo-red/10"
                            : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <Link
                          href={clubAdminPath(
                            clubSlug,
                            `students/${member.memberId}/profile`,
                          )}
                          className="block truncate text-sm font-semibold text-dojo-white hover:text-dojo-red hover:underline"
                        >
                          {member.fullName}
                        </Link>
                        <p className="text-xs text-dojo-muted">
                          {MEMBERSHIP_PAYMENT_STATUS_LABELS[member.status]}
                          {dueLabel ? ` · Next due ${dueLabel}` : " · Next due after first payment"}
                          {member.email ? ` · ${member.email}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                        <div className="flex w-[4.75rem] shrink-0 items-center justify-start">
                          {isPaid ? (
                            <span className="inline-flex w-full items-center justify-center rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400">
                              Paid
                            </span>
                          ) : member.monthState === "overdue" ? (
                            <span className="inline-flex w-full items-center justify-center rounded-md bg-dojo-red/20 px-2 py-1 text-xs font-semibold text-dojo-red">
                              Overdue
                            </span>
                          ) : canMarkPaid ? null : (
                            <span className="inline-flex w-full items-center justify-center rounded-md bg-dojo-elevated px-2 py-1 text-xs text-dojo-muted">
                              {member.monthState === "paused"
                                ? "Paused"
                                : member.monthState === "inactive"
                                  ? "Inactive"
                                  : member.monthState === "future"
                                    ? "Future"
                                    : "N/A"}
                            </span>
                          )}
                        </div>

                        {(isPaid && member.payment) || canMarkPaid ? (
                          <label className="flex shrink-0 items-center gap-1 text-xs text-dojo-muted">
                            Paid date
                            {isPaid && member.payment ? (
                              <input
                                type="date"
                                defaultValue={member.payment.paidAt}
                                disabled={isPending}
                                onBlur={(event) => {
                                  const next = event.target.value;
                                  if (!next || next === member.payment?.paidAt) {
                                    return;
                                  }

                                  runAction(() =>
                                    updateMembershipPaidAtAction({
                                      clubSlug,
                                      memberId: member.memberId,
                                      billingMonth,
                                      paidAt: next,
                                    }),
                                  );
                                }}
                                className="w-[9.5rem] rounded border border-dojo-border bg-dojo-elevated px-2 py-1 text-dojo-white"
                              />
                            ) : (
                              <input
                                type="date"
                                required
                                value={paidAtDrafts[member.memberId] ?? todayIso}
                                disabled={isPending}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setPaidAtDrafts((previous) => ({
                                    ...previous,
                                    [member.memberId]: value,
                                  }));
                                }}
                                className="w-[9.5rem] rounded border border-dojo-border bg-dojo-elevated px-2 py-1 text-dojo-white"
                              />
                            )}
                          </label>
                        ) : (
                          <div className="hidden w-[9.5rem] sm:block" aria-hidden />
                        )}

                        <div className="flex w-[5.75rem] shrink-0 items-center justify-start">
                          {isPaid && member.payment ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Remove the ${billingMonthLabel(billingMonth)} payment for ${member.fullName}?`,
                                  )
                                ) {
                                  return;
                                }

                                runAction(() =>
                                  unmarkMembershipPaidAction({
                                    clubSlug,
                                    memberId: member.memberId,
                                    billingMonth,
                                  }),
                                );
                              }}
                              className="w-full rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30"
                            >
                              Unmark
                            </button>
                          ) : canMarkPaid ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                const paidAt =
                                  paidAtDrafts[member.memberId]?.trim() || todayIso;

                                if (!paidAt) {
                                  setErrorMessage("Payment date is required.");
                                  return;
                                }

                                runAction(() =>
                                  markMembershipPaidAction({
                                    clubSlug,
                                    memberId: member.memberId,
                                    billingMonth,
                                    paidAt,
                                  }),
                                );
                              }}
                              className="w-full rounded-lg bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white hover:opacity-90"
                            >
                              Mark paid
                            </button>
                          ) : null}
                        </div>

                        {member.status === "active" ? (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() =>
                                  pauseMembershipPaymentAction({
                                    clubSlug,
                                    memberId: member.memberId,
                                  }),
                                )
                              }
                              className="rounded-lg border border-dojo-border px-3 py-1.5 text-xs text-dojo-muted hover:text-dojo-white"
                            >
                              Pause
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Mark ${member.fullName} inactive for membership payments? Their payment history is kept.`,
                                  )
                                ) {
                                  return;
                                }

                                runAction(() =>
                                  inactivateMembershipPaymentAction({
                                    clubSlug,
                                    memberId: member.memberId,
                                  }),
                                );
                              }}
                              className="rounded-lg border border-dojo-border px-3 py-1.5 text-xs text-dojo-muted hover:text-dojo-white"
                            >
                              Make inactive
                            </button>
                          </>
                        ) : null}

                        {member.status === "paused" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runAction(() =>
                                resumeMembershipPaymentAction({
                                  clubSlug,
                                  memberId: member.memberId,
                                }),
                              )
                            }
                            className="rounded-lg border border-dojo-border px-3 py-1.5 text-xs text-dojo-white"
                          >
                            Resume
                          </button>
                        ) : null}

                        {member.status === "inactive" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runAction(() =>
                                reactivateMembershipPaymentAction({
                                  clubSlug,
                                  memberId: member.memberId,
                                }),
                              )
                            }
                            className="rounded-lg border border-dojo-border px-3 py-1.5 text-xs text-dojo-white"
                          >
                            Reactivate
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dojo-border text-xs uppercase tracking-wide text-dojo-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Member</th>
                {monthNames.map((label) => (
                  <th key={label} className="px-1 py-3 text-center font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dojo-border">
              {yearRows.map((member) => (
                <tr key={member.memberId}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-dojo-white">
                    {member.fullName}
                  </td>
                  {member.cells.map((cell) => (
                    <td key={cell.billingMonth} className="px-1 py-2 text-center">
                      <YearCell state={cell.state} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
