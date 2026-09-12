import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { MembershipPaymentsClient } from "@/components/admin/membership-payments-client";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import {
  isMembershipPaymentsEnabledForClub,
  loadMembershipPaymentsWorkspace,
  MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/membership-payments.server";
import {
  currentLocalDateIso,
  toBillingMonthKey,
} from "@/lib/membership-payments.shared";
import { getClubIanaTimeZone } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

interface MembershipPaymentsPageProps {
  params: { clubSlug: string };
  searchParams?: {
    month?: string;
    year?: string;
    view?: string;
  };
}

export async function generateMetadata({
  params,
}: MembershipPaymentsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Membership Payments`,
    description: `Manual membership payment ledger for ${club.name}.`,
  };
}

export default async function MembershipPaymentsPage({
  params,
  searchParams,
}: MembershipPaymentsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const enabled = await isMembershipPaymentsEnabledForClub(club.id);

  if (!enabled) {
    notFound();
  }

  let workspace;

  try {
    const yearRaw = searchParams?.year ? Number(searchParams.year) : null;
    workspace = await loadMembershipPaymentsWorkspace({
      academyId: club.id,
      clubSlug: club.slug,
      billingMonth: searchParams?.month
        ? toBillingMonthKey(searchParams.month)
        : null,
      year: yearRaw && Number.isFinite(yearRaw) ? yearRaw : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE;

    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Membership & Payments" clubName={club.name} />
        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
        </AdminNavLinks>
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {message}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Membership & Payments" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Membership & Payments
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-dojo-muted">
          Manual monthly payment ledger for {club.name}. Uses existing academy members —
          tick people off as paid, pause or inactivate without deleting records.
        </p>
      </section>

      <MembershipPaymentsClient
        clubSlug={club.slug}
        billingMonth={workspace.billingMonth}
        currentBillingMonth={workspace.currentBillingMonth}
        todayIso={currentLocalDateIso(new Date(), getClubIanaTimeZone(club.slug))}
        year={workspace.year}
        initialView={searchParams?.view === "year" ? "year" : "month"}
        summary={workspace.summary}
        rows={workspace.rows}
        yearRows={workspace.yearRows}
      />
    </main>
  );
}
