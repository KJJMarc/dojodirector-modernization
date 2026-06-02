import type { StudentPortalGradingHistoryPageData } from "@/lib/student-portal.shared";
import { formatProfileField } from "@/lib/admin-student-profile.shared";

interface StudentPortalGradingHistoryViewProps {
  pageData: StudentPortalGradingHistoryPageData;
}

export function StudentPortalGradingHistoryView({
  pageData,
}: StudentPortalGradingHistoryViewProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Grading History</h2>
        <p className="mt-1 text-sm text-dojo-muted">
          Your belt and stripe progression at the academy.
        </p>
      </div>

      {pageData.entries.length === 0 ? (
        <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-6 text-center text-sm text-dojo-muted">
          No grading history recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dojo-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Previous Rank</th>
                <th className="px-3 py-2">New Rank</th>
                <th className="px-3 py-2">Awarded By</th>
              </tr>
            </thead>
            <tbody>
              {pageData.entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-dojo-border/70 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-3 py-2 leading-snug text-dojo-muted">
                    {entry.dateLabel}
                  </td>
                  <td className="px-3 py-2 leading-snug text-dojo-white">
                    {entry.previousRankLabel}
                  </td>
                  <td className="px-3 py-2 font-medium leading-snug text-dojo-white">
                    {entry.newRankLabel}
                  </td>
                  <td className="px-3 py-2 leading-snug text-dojo-muted">
                    {formatProfileField(entry.awardedByLabel)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
