import Link from "next/link";
import { LeadSourceAnalyticsSearchForm } from "@/components/admin/lead-source-analytics-search-form";
import { clubAdminPath } from "@/lib/clubs.shared";
import { clubLeadDetailAdminPath } from "@/lib/leads.shared";
import type {
  AnalyticsLeadSource,
  LeadSourceAnalyticsPageData,
  LeadSourceAttributionRecord,
} from "@/lib/lead-source-analytics.shared";

interface LeadSourceAnalyticsViewProps {
  clubSlug: string;
  data: LeadSourceAnalyticsPageData;
  initialQuery?: string;
  initialLeadSource?: AnalyticsLeadSource;
  hasActiveSearch: boolean;
  attributionRecords: LeadSourceAttributionRecord[];
  totalAttributionCount: number;
}

const TABLE_CLASS =
  "w-full min-w-[640px] border-collapse text-left text-sm text-dojo-white";
const TH_CLASS =
  "border-b border-dojo-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-dojo-muted";
const TD_CLASS = "border-b border-dojo-border/60 px-3 py-2.5";
const TOTAL_ROW_CLASS = "bg-dojo-elevated/40 font-semibold";

function AnalyticsTable({
  ariaLabel,
  headers,
  rows,
  totalRow,
}: {
  ariaLabel: string;
  headers: string[];
  rows: (string | number)[][];
  totalRow: (string | number)[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
      <table className={TABLE_CLASS} aria-label={ariaLabel}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className={TH_CLASS}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${row[0]}-${cellIndex}`}
                  className={cellIndex === 0 ? `${TD_CLASS} font-medium` : TD_CLASS}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className={TOTAL_ROW_CLASS}>
            {totalRow.map((cell, cellIndex) => (
              <td
                key={`total-${cellIndex}`}
                className={cellIndex === 0 ? `${TD_CLASS} font-semibold` : TD_CLASS}
              >
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatRecordTypeLabel(recordType: LeadSourceAttributionRecord["recordType"]) {
  return recordType === "lead" ? "Lead" : "Student";
}

function AttributionRecordLink({
  clubSlug,
  record,
}: {
  clubSlug: string;
  record: LeadSourceAttributionRecord;
}) {
  const href =
    record.recordType === "lead"
      ? clubLeadDetailAdminPath(clubSlug, record.id)
      : clubAdminPath(clubSlug, `students/${record.id}/profile`);

  return (
    <Link
      href={href}
      className="font-medium text-dojo-white transition hover:text-dojo-red"
    >
      {record.name}
    </Link>
  );
}

export function LeadSourceAnalyticsView({
  clubSlug,
  data,
  initialQuery,
  initialLeadSource,
  hasActiveSearch,
  attributionRecords,
  totalAttributionCount,
}: LeadSourceAnalyticsViewProps) {
  const funnelRows = data.funnelRows.map((row) => [
    row.sourceLabel,
    row.leads,
    row.trialBooked,
    row.joined,
    row.conversionPercent,
  ]);

  const qualityRows = data.qualityRows.map((row) => [
    row.sourceLabel,
    row.leads,
    row.members,
    row.activeMembers,
  ]);

  const attributionCountLabel =
    hasActiveSearch && attributionRecords.length !== totalAttributionCount
      ? `${attributionRecords.length} of ${totalAttributionCount} records`
      : hasActiveSearch
        ? `${attributionRecords.length} records`
        : `${totalAttributionCount} records`;

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Find lead source
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-dojo-muted">
            Search leads and students by name, email, or original lead source to
            see where they came from.
          </p>
        </div>

        <LeadSourceAnalyticsSearchForm
          clubSlug={clubSlug}
          initialQuery={initialQuery ?? ""}
          initialLeadSource={initialLeadSource}
        />

        {hasActiveSearch ? (
          <div className="space-y-3">
            <p className="text-sm text-dojo-muted">{attributionCountLabel}</p>
            {attributionRecords.length === 0 ? (
              <div className="rounded-xl border border-dojo-border bg-dojo-elevated/20 p-6 text-center text-sm text-dojo-muted">
                No leads or students match your search.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-elevated/20">
                <table
                  className={TABLE_CLASS}
                  aria-label="Lead source attribution search results"
                >
                  <thead>
                    <tr>
                      {["Name", "Email", "Type", "Original lead source", "Status"].map(
                        (header) => (
                          <th key={header} scope="col" className={TH_CLASS}>
                            {header}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {attributionRecords.map((record) => (
                      <tr key={`${record.recordType}-${record.id}`}>
                        <td className={`${TD_CLASS} font-medium`}>
                          <AttributionRecordLink clubSlug={clubSlug} record={record} />
                        </td>
                        <td className={`${TD_CLASS} text-dojo-muted`}>
                          {record.email ?? "—"}
                        </td>
                        <td className={TD_CLASS}>
                          {formatRecordTypeLabel(record.recordType)}
                        </td>
                        <td className={TD_CLASS}>
                          {record.originalLeadSourceLabel ?? "—"}
                        </td>
                        <td className={TD_CLASS}>{record.statusLabel ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-dojo-muted">
            Use the search above to look up a specific lead or student.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Lead funnel by source
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-dojo-muted">
            Enquiry volume, trial bookings, and joins grouped by original lead source.
          </p>
        </div>
        <AnalyticsTable
          ariaLabel="Lead funnel by source"
          headers={["Source", "Leads", "Trial Booked", "Joined", "Conversion %"]}
          rows={funnelRows}
          totalRow={[
            "Total",
            data.totals.leads,
            data.totals.trialBooked,
            data.totals.joined,
            data.totals.leads > 0
              ? `${((data.totals.joined / data.totals.leads) * 100).toFixed(1)}%`
              : "—",
          ]}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Student quality by source
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-dojo-muted">
            Members attributed to each source. Active members have an active club membership.
          </p>
        </div>
        <AnalyticsTable
          ariaLabel="Student quality by source"
          headers={["Source", "Leads", "Members", "Active Members"]}
          rows={qualityRows}
          totalRow={[
            "Total",
            data.totals.leads,
            data.totals.members,
            data.totals.activeMembers,
          ]}
        />
      </section>
    </div>
  );
}
