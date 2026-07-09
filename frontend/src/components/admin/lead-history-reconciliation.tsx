import type { LeadHistoryReconciliation } from "@/lib/lead-history-report.shared";

interface LeadHistoryReconciliationProps {
  reconciliation: LeadHistoryReconciliation;
  isMonthDrillDown: boolean;
}

const rowClassName = "flex items-center justify-between gap-3 text-sm";

export function LeadHistoryReconciliationPanel({
  reconciliation,
  isMonthDrillDown,
}: LeadHistoryReconciliationProps) {
  const items = [
    { label: "Total leads in database", value: reconciliation.totalLeadsInDb },
    { label: "Active non-archived", value: reconciliation.activeNonArchivedLeads },
    { label: "Archived", value: reconciliation.archivedLeads },
    { label: "Joined", value: reconciliation.joinedLeads },
    { label: "Rows displayed", value: reconciliation.rowsDisplayed },
  ];

  return (
    <section
      aria-label="Lead history count reconciliation"
      className={`rounded-xl border px-4 py-4 ${
        reconciliation.reconciles
          ? "border-dojo-border bg-dojo-surface"
          : "border-dojo-amber-500/40 bg-dojo-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Count reconciliation
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            {isMonthDrillDown
              ? "Month drill-down is active, so displayed rows may be lower than the academy total."
              : "Default view should include every lead still present in the database for this academy."}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            reconciliation.reconciles
              ? "bg-dojo-red/15 text-dojo-white"
              : "bg-dojo-amber-500/20 text-dojo-amber-200"
          }`}
        >
          {reconciliation.reconciles ? "Reconciled" : "Mismatch"}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className={rowClassName}>
            <dt className="text-dojo-muted">{item.label}</dt>
            <dd className="font-semibold tabular-nums text-dojo-white">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
