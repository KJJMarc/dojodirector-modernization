"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteLeadAction,
  updateLeadAction,
} from "@/app/admin/[clubSlug]/leads/actions";
import { LeadAttributionPanel } from "@/components/admin/lead-attribution-panel";
import {
  ADMIN_EDIT_LEAD_SOURCE_OPTIONS,
  LEAD_EXPERIENCE_LEVELS,
  LEAD_PROGRAMME_INTERESTS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  clubLeadsAdminPath,
  clubLeadsListAdminPath,
  formatAdminLeadDateTime,
  formatLeadExperienceLevelLabel,
  formatLeadProgrammeInterestLabel,
  formatLeadSourceLabel,
  resolveAdminEditableLeadSource,
  type AdminLeadDetail,
} from "@/lib/leads.shared";

interface LeadDetailViewProps {
  clubSlug: string;
  lead: AdminLeadDetail;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function LeadDetailView({ clubSlug, lead }: LeadDetailViewProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(lead.fullName);
  const [email, setEmail] = useState(lead.email);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [programmeInterest, setProgrammeInterest] = useState(lead.programmeInterest);
  const [experienceLevel, setExperienceLevel] = useState(lead.experienceLevel);
  const [leadSource, setLeadSource] = useState(() =>
    resolveAdminEditableLeadSource(lead.leadSource),
  );
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}>
      <div className="grid gap-2 rounded-xl border border-dojo-border bg-dojo-surface p-4 text-sm text-dojo-muted sm:grid-cols-2">
        <p>
          <span className="font-medium text-dojo-white">Status:</span> {lead.statusLabel}
        </p>
        <p>
          <span className="font-medium text-dojo-white">Submitted:</span>{" "}
          {formatAdminLeadDateTime(lead.submittedAt)}
        </p>
        <p>
          <span className="font-medium text-dojo-white">Last activity:</span>{" "}
          {formatAdminLeadDateTime(lead.lastActivityAt)}
        </p>
        {lead.contactedAt ? (
          <p>
            <span className="font-medium text-dojo-white">Contacted:</span>{" "}
            {formatAdminLeadDateTime(lead.contactedAt)}
          </p>
        ) : null}
        {lead.trialBookedAt ? (
          <p>
            <span className="font-medium text-dojo-white">Trial booked:</span>{" "}
            {formatAdminLeadDateTime(lead.trialBookedAt)}
          </p>
        ) : null}
        {lead.trialAttendedAt ? (
          <p>
            <span className="font-medium text-dojo-white">Trial attended:</span>{" "}
            {formatAdminLeadDateTime(lead.trialAttendedAt)}
          </p>
        ) : null}
        {lead.joinedAt ? (
          <p>
            <span className="font-medium text-dojo-white">Joined:</span>{" "}
            {formatAdminLeadDateTime(lead.joinedAt)}
          </p>
        ) : null}
      </div>

      {lead.trialSessionMissed ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-3 text-sm text-dojo-white"
          role="status"
        >
          <p>
            This trial session was in the past and no attendance was recorded. Update the
            status to <span className="font-medium">Trial Missed</span> if they did not
            attend.
          </p>
          <button
            type="button"
            disabled={isPending}
            className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-amber-400/60 bg-dojo-amber-500/20 px-3 py-1.5 text-sm font-semibold text-dojo-white transition hover:border-dojo-amber-300 hover:bg-dojo-amber-500/30 disabled:cursor-not-allowed"
            onClick={() => setStatus("trial_missed")}
          >
            Set status to Trial Missed
          </button>
        </section>
      ) : null}

      <LeadAttributionPanel
        attribution={lead.attribution}
        leadSourceLabel={lead.leadSourceLabel}
      />

      <form
        className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          setSuccessMessage(null);

          startTransition(async () => {
            try {
              await updateLeadAction({
                clubSlug,
                leadId: lead.id,
                fullName,
                email,
                phone,
                programmeInterest,
                experienceLevel,
                leadSource,
                status,
                notes,
              });
              setSuccessMessage("Lead updated.");
              router.refresh();
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : "Unable to update lead.",
              );
            }
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className={labelClassName}>Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className={inputClassName}
            />
          </label>

          <label className="block space-y-1">
            <span className={labelClassName}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={inputClassName}
            />
          </label>

          <label className="block space-y-1">
            <span className={labelClassName}>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="block space-y-1">
            <span className={labelClassName}>Programme interest</span>
            <select
              value={programmeInterest}
              onChange={(event) =>
                setProgrammeInterest(event.target.value as typeof programmeInterest)
              }
              className={inputClassName}
            >
              {LEAD_PROGRAMME_INTERESTS.map((value) => (
                <option key={value} value={value}>
                  {formatLeadProgrammeInterestLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className={labelClassName}>Experience level</span>
            <select
              value={experienceLevel}
              onChange={(event) =>
                setExperienceLevel(event.target.value as typeof experienceLevel)
              }
              className={inputClassName}
            >
              {LEAD_EXPERIENCE_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {formatLeadExperienceLevelLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className={labelClassName}>Lead source</span>
            <select
              value={leadSource}
              onChange={(event) => setLeadSource(event.target.value as typeof leadSource)}
              className={inputClassName}
            >
              {ADMIN_EDIT_LEAD_SOURCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatLeadSourceLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className={labelClassName}>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className={inputClassName}
            >
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {LEAD_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className={labelClassName}>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={6}
              className={`${inputClassName} min-h-[120px]`}
              placeholder="Add internal notes about follow-up, calls, or trial booking."
            />
          </label>
        </div>

        {successMessage ? (
          <p
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={clubLeadsListAdminPath(clubSlug)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
          >
            Back to list
          </Link>
          <Link
            href={clubLeadsAdminPath(clubSlug)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
          >
            Manage Leads
          </Link>
        </div>
      </form>

      <div className="rounded-xl border border-dojo-red/30 bg-dojo-red/5 p-4">
        <h3 className="text-sm font-semibold text-dojo-white">Delete lead</h3>
        <p className="mt-1 text-sm text-dojo-muted">
          Remove test or spam enquiries. This cannot be undone.
        </p>
        <button
          type="button"
          disabled={isPending}
          className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-red transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
          onClick={() => {
            if (!window.confirm("Delete this lead permanently?")) {
              return;
            }

            setErrorMessage(null);
            setSuccessMessage(null);

            startTransition(async () => {
              try {
                await deleteLeadAction({ clubSlug, leadId: lead.id });
                router.push(clubLeadsListAdminPath(clubSlug));
                router.refresh();
              } catch (error) {
                setErrorMessage(
                  error instanceof Error ? error.message : "Unable to delete lead.",
                );
              }
            });
          }}
        >
          Delete lead
        </button>
      </div>
    </div>
  );
}
