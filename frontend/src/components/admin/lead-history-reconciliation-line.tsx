import type { LeadHistoryReconciliation } from "@/lib/lead-history-report.shared";

interface LeadHistoryReconciliationLineProps {
  reconciliation: LeadHistoryReconciliation;
}

export function LeadHistoryReconciliationLine({
  reconciliation,
}: LeadHistoryReconciliationLineProps) {
  return (
    <p
      className="rounded-md border border-dojo-border bg-dojo-elevated/60 px-3 py-2 text-xs text-dojo-muted"
      aria-label="Lead history count reconciliation"
    >
      <span className="font-semibold uppercase tracking-wide text-dojo-white">Admin reconciliation:</span>{" "}
      Total in database {reconciliation.totalLeadsInDb} · Active {reconciliation.activeNonArchivedLeads}{" "}
      · Archived {reconciliation.archivedLeads} · Joined {reconciliation.joinedLeads} · Rows
      currently shown {reconciliation.rowsDisplayed}
      {!reconciliation.reconciles ? (
        <span className="text-dojo-amber-300"> · Filtered view active</span>
      ) : null}
    </p>
  );
}
