"use client";

import {
  formatLeadAttributionFieldLabel,
  hasLeadAttributionData,
  type LeadAttribution,
} from "@/lib/lead-attribution.shared";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

interface LeadAttributionPanelProps {
  attribution: LeadAttribution;
  leadSourceLabel: string;
}

export function LeadAttributionPanel({
  attribution,
  leadSourceLabel,
}: LeadAttributionPanelProps) {
  if (!hasLeadAttributionData(attribution)) {
    return (
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h3 className="text-sm font-semibold text-dojo-white">Attribution</h3>
        <p className="mt-2 text-sm text-dojo-muted">
          Channel: <span className="text-dojo-white">{leadSourceLabel}</span>
        </p>
        <p className="mt-1 text-xs text-dojo-muted">
          No click IDs, UTM parameters, or referrer were captured for this enquiry.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <h3 className="text-sm font-semibold text-dojo-white">Attribution</h3>
      <p className="mt-2 text-sm text-dojo-muted">
        Channel: <span className="text-dojo-white">{leadSourceLabel}</span>
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {(
          [
            "gclid",
            "fbclid",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "referrer_url",
          ] as const
        ).map((field) => {
          const value = attribution[field];

          if (!value) {
            return null;
          }

          return (
            <div key={field} className={field === "referrer_url" ? "sm:col-span-2" : undefined}>
              <dt className={labelClassName}>{formatLeadAttributionFieldLabel(field)}</dt>
              <dd className="mt-1 break-all text-sm text-dojo-white">
                {field === "referrer_url" ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dojo-red transition hover:text-dojo-white"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
