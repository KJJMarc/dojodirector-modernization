import Link from "next/link";
import { LeadRowActions } from "@/components/admin/lead-row-actions";
import {
  clubLeadDetailAdminPath,
  formatAdminLeadDate,
  formatAdminLeadDateTime,
  formatLeadFollowUpStatusLabel,
  formatLeadProgrammeInterestLabel,
  formatLeadStatusLabel,
  type AdminLeadListRow,
} from "@/lib/leads.shared";

interface LeadsTableProps {
  clubSlug: string;
  leads: AdminLeadListRow[];
}

export function LeadsTable({ clubSlug, leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No leads yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-dojo-border text-xs uppercase tracking-wide text-dojo-muted">
          <tr>
            <th className="px-3 py-3 font-semibold">Name</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Programme</th>
            <th className="px-3 py-3 font-semibold">Submitted</th>
            <th className="px-3 py-3 font-semibold">Last Activity</th>
            <th className="px-3 py-3 font-semibold">Follow-up</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dojo-border">
          {leads.map((lead) => (
            <tr key={lead.id} className="text-dojo-white">
              <td className="px-3 py-3">
                <Link
                  href={clubLeadDetailAdminPath(clubSlug, lead.id)}
                  className="font-medium text-dojo-red transition hover:text-dojo-white"
                >
                  {lead.fullName}
                </Link>
              </td>
              <td className="px-3 py-3">{formatLeadStatusLabel(lead.status)}</td>
              <td className="px-3 py-3">
                {formatLeadProgrammeInterestLabel(lead.programmeInterest)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                {formatAdminLeadDate(lead.submittedAt)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                {formatAdminLeadDateTime(lead.lastActivityAt)}
              </td>
              <td className="px-3 py-3">
                <span
                  className={
                    lead.followUpStatus === "needs_follow_up"
                      ? "font-medium text-dojo-amber-300"
                      : "text-dojo-muted"
                  }
                >
                  {formatLeadFollowUpStatusLabel(lead.followUpStatus)}
                </span>
              </td>
              <td className="w-[1%] whitespace-nowrap px-3 py-3">
                <LeadRowActions
                  clubSlug={clubSlug}
                  leadId={lead.id}
                  leadName={lead.fullName}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
