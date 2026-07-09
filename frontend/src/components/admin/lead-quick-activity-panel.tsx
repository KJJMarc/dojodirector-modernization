"use client";

import { useState, useTransition } from "react";
import { logLeadActivityAction } from "@/app/admin/[clubSlug]/leads/actions";
import {
  buildLeadContactSummary,
  formatLeadActivityTypeLabel,
  QUICK_LEAD_ACTIVITY_TYPES,
  type LeadActivity,
  type ManualLeadActivityType,
} from "@/lib/leads-crm.shared";
import { formatAdminLeadDateTime } from "@/lib/leads.shared";

interface LeadQuickActivityPanelProps {
  clubSlug: string;
  leadId: string;
  activities: LeadActivity[];
  bannerLabel: string | null;
  onActivityLogged?: () => void;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

export function LeadQuickActivityPanel({
  clubSlug,
  leadId,
  activities,
  bannerLabel,
  onActivityLogged,
}: LeadQuickActivityPanelProps) {
  const [selectedType, setSelectedType] = useState<ManualLeadActivityType | null>(null);
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const contactSummary = buildLeadContactSummary(activities);

  const handleSubmit = () => {
    if (!selectedType) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        await logLeadActivityAction({
          clubSlug,
          leadId,
          activityType: selectedType,
          body: notes,
          followUpAt: followUpDate ? `${followUpDate}T09:00:00.000Z` : null,
        });
        setSelectedType(null);
        setNotes("");
        setFollowUpDate("");
        onActivityLogged?.();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to log activity.",
        );
      }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Contact timeline
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Log calls, emails, and notes. Follow-up recommendations use your academy workflow.
          </p>
        </div>
        {bannerLabel ? (
          <p className="rounded-full border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white">
            {bannerLabel}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryItem label="Emails sent" value={contactSummary.emailsSent} />
        <SummaryItem label="Calls made" value={contactSummary.callsMade} />
        <SummaryItem label="Messages sent" value={contactSummary.messagesSent} />
        <SummaryItem label="Total attempts" value={contactSummary.totalContactAttempts} />
        <SummaryItem
          label="Last contacted"
          value={
            contactSummary.lastContactedAt
              ? formatAdminLeadDateTime(contactSummary.lastContactedAt)
              : "—"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LEAD_ACTIVITY_TYPES.map((activityType) => {
          const isActive = selectedType === activityType;

          return (
            <button
              key={activityType}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedType(isActive ? null : activityType)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "border-dojo-red/60 bg-dojo-red/15 text-dojo-white"
                  : "border-dojo-border bg-dojo-elevated text-dojo-muted hover:border-dojo-red/40 hover:text-dojo-white"
              }`}
            >
              {formatLeadActivityTypeLabel(activityType)}
            </button>
          );
        })}
      </div>

      {selectedType ? (
        <div className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated/60 p-3">
          <p className="text-sm font-medium text-dojo-white">
            Log {formatLeadActivityTypeLabel(selectedType).toLowerCase()}
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={`${inputClassName} min-h-[80px]`}
              placeholder="What happened on this contact?"
            />
          </label>
          <label className="block max-w-xs space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Follow-up date (optional)
            </span>
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className={inputClassName}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving…" : "Save activity"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedType(null);
                setNotes("");
                setFollowUpDate("");
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-muted transition hover:text-dojo-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-dojo-border bg-dojo-elevated/50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-dojo-white">{value}</p>
    </div>
  );
}
