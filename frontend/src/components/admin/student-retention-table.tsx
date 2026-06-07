"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  formatRetentionDateLabel,
  formatRetentionDaysLabel,
  studentRetentionRiskLevelLabel,
  type AdminStudentRetentionRow,
  type StudentRetentionRiskLevel,
} from "@/lib/admin-student-retention.shared";

interface StudentRetentionTableProps {
  rows: AdminStudentRetentionRow[];
}

const retentionStudentProfileLinkClassName =
  "font-medium text-dojo-white underline-offset-2 transition hover:text-dojo-red hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dojo-red";

const retentionSuggestedActionsButtonClassName =
  "whitespace-nowrap rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

function riskBadgeClassName(level: StudentRetentionRiskLevel) {
  switch (level) {
    case "critical":
      return "border border-red-900/80 bg-red-950/60 text-red-200";
    case "high":
      return "bg-dojo-red/20 text-dojo-red";
    case "medium":
      return "bg-amber-500/15 text-amber-300";
    default:
      return "bg-emerald-500/15 text-emerald-400";
  }
}

function SuggestedActionsPanel({
  row,
  onClose,
}: {
  row: AdminStudentRetentionRow;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`retention-actions-${row.userId}`}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-dojo-border bg-dojo-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id={`retention-actions-${row.userId}`}
              className="text-lg font-semibold text-dojo-white"
            >
              Suggested actions
            </h3>
            <p className="mt-1 text-sm text-dojo-muted">{row.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-dojo-border px-2 py-1 text-xs font-semibold text-dojo-muted transition hover:text-dojo-white"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-red">
            Risk reasons
          </h4>
          {row.reasons.length === 0 ? (
            <p className="mt-2 text-sm text-dojo-muted">No elevated risk factors detected.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dojo-white">
              {row.reasons.map((reason) => (
                <li key={reason.id}>{reason.label}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-red">
            Suggested actions
          </h4>
          <ul className="mt-2 space-y-2">
            {row.suggestedActions.map((action) => (
              <li
                key={action.id}
                className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
              >
                {action.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-xs text-dojo-muted">
          Read-only guidance for now — messaging and automation are not connected yet.
        </p>
      </div>
    </div>
  );
}

export function StudentRetentionTable({ rows }: StudentRetentionTableProps) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const closePanel = useCallback(() => setOpenUserId(null), []);
  const openRow = rows.find((row) => row.userId === openUserId) ?? null;

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No students found for retention analysis.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-dojo-border text-xs uppercase tracking-wide text-dojo-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Student</th>
              <th className="px-3 py-3 font-semibold">Belt</th>
              <th className="px-3 py-3 font-semibold">Last attendance</th>
              <th className="px-3 py-3 font-semibold">Days since</th>
              <th className="px-3 py-3 font-semibold">Last 30 days</th>
              <th className="px-3 py-3 font-semibold">Future bookings</th>
              <th className="px-3 py-3 font-semibold">Risk score</th>
              <th className="px-3 py-3 font-semibold">Level</th>
              <th className="px-3 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dojo-border">
            {rows.map((row) => (
              <tr key={row.userId} className="text-dojo-white">
                <td className="px-3 py-3">
                  <Link
                    href={row.profileHref}
                    className={retentionStudentProfileLinkClassName}
                    title={`View profile for ${row.fullName}`}
                    aria-label={`View profile for ${row.fullName}`}
                  >
                    {row.fullName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-dojo-muted">{row.beltLabel ?? "—"}</td>
                <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                  {formatRetentionDateLabel(row.lastAttendanceDate)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                  {formatRetentionDaysLabel(row.daysSinceLastAttendance)}
                </td>
                <td className="px-3 py-3">{row.attendanceLast30Days}</td>
                <td className="px-3 py-3">{row.futureBookingsCount}</td>
                <td className="px-3 py-3 font-semibold tabular-nums">{row.score}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${riskBadgeClassName(row.level)}`}
                  >
                    {studentRetentionRiskLevelLabel(row.level)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenUserId(row.userId)}
                    className={retentionSuggestedActionsButtonClassName}
                  >
                    Suggested Actions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openRow ? (
        <SuggestedActionsPanel row={openRow} onClose={closePanel} />
      ) : null}
    </>
  );
}
