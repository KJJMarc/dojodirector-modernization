import type { AcademyPixelTrackingStatusSummary } from "@/lib/academy-pixel-tracking.shared";
import { formatPixelTrackingEventType } from "@/lib/academy-pixel-tracking.shared";
import { clubTrialEnquiryPath } from "@/lib/clubs.shared";
import { formatLondonShortDateTime } from "@/lib/london-datetime";

interface AcademyPixelTrackingStatusProps {
  clubSlug: string;
  status: AcademyPixelTrackingStatusSummary;
  configuredGoogleTagId?: string;
}

const detailLabelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";
const detailValueClassName = "text-sm text-dojo-white";

function formatLastEventTimestamp(receivedAt: string | null) {
  if (!receivedAt) {
    return "—";
  }

  const parsed = Date.parse(receivedAt);

  if (Number.isNaN(parsed)) {
    return "—";
  }

  return formatLondonShortDateTime(receivedAt);
}

function TrackingStatusCard({
  title,
  indicator,
  label,
  children,
}: {
  title: string;
  indicator: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-dojo-white">{title}</h4>
        <p className="flex items-center gap-2 text-sm text-dojo-white">
          <span aria-hidden="true">{indicator}</span>
          <span>{label}</span>
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </article>
  );
}

function StatusDetail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className={detailLabelClassName}>{label}</dt>
      <dd className={`${detailValueClassName} mt-1 break-words`}>{value}</dd>
    </div>
  );
}

export function AcademyPixelTrackingStatus({
  clubSlug,
  status,
  configuredGoogleTagId = "",
}: AcademyPixelTrackingStatusProps) {
  const metaEventType = formatPixelTrackingEventType(status.meta.lastEvent.eventType);
  const googleEventType = formatPixelTrackingEventType(status.google.lastEvent.eventType);
  const googleTagId =
    status.google.googleTagId?.trim() || configuredGoogleTagId.trim() || null;
  const testTrackingHref = clubTrialEnquiryPath(clubSlug);

  return (
    <section className="space-y-4 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-dojo-white">Tracking Status</h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Live status based on events detected on your public academy pages. Status
            updates after visitors load pages or submit trial enquiries.
          </p>
          {!status.statusAvailable ? (
            <p className="mt-2 text-xs text-dojo-muted">
              Status monitoring is unavailable until the tracking status database
              migration has been applied.
            </p>
          ) : null}
        </div>
        <a
          href={testTrackingHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-black px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          Test Tracking
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrackingStatusCard
          title="Meta Pixel"
          indicator={status.meta.indicator}
          label={status.meta.label}
        >
          <StatusDetail
            label="Last event received"
            value={metaEventType ?? "None yet"}
          />
          <StatusDetail
            label="Event type"
            value={status.meta.lastEvent.eventType ?? "—"}
          />
          <StatusDetail
            label="Timestamp"
            value={formatLastEventTimestamp(status.meta.lastEvent.receivedAt)}
            className="sm:col-span-2"
          />
        </TrackingStatusCard>

        <TrackingStatusCard
          title="Google tag"
          indicator={status.google.indicator}
          label={status.google.label}
        >
          <StatusDetail label="Google tag ID" value={googleTagId ?? "—"} />
          <StatusDetail
            label="Last detected event"
            value={googleEventType ?? "—"}
          />
          <StatusDetail
            label="Timestamp"
            value={formatLastEventTimestamp(status.google.lastEvent.receivedAt)}
            className="sm:col-span-2"
          />
        </TrackingStatusCard>
      </div>
    </section>
  );
}
