import Link from "next/link";
import { ArchivedLeadRowActions } from "@/components/admin/archived-lead-row-actions";
import {
  clubLeadDetailAdminPath,
  formatAdminLeadDateTime,
  formatLeadProgrammeInterestLabel,
  type AdminArchivedLeadListRow,
} from "@/lib/leads.shared";

interface ArchivedLeadsTableProps {
  clubSlug: string;
  leads: AdminArchivedLeadListRow[];
}

export function ArchivedLeadsTable({ clubSlug, leads }: ArchivedLeadsTableProps) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No archived leads.
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
            <th className="px-3 py-3 font-semibold">Archived Date</th>
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
              <td className="px-3 py-3">{lead.statusLabel}</td>
              <td className="px-3 py-3">
                {formatLeadProgrammeInterestLabel(lead.programmeInterest)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                {formatAdminLeadDateTime(lead.archivedAt)}
              </td>
              <td className="w-[1%] whitespace-nowrap px-3 py-3">
                <ArchivedLeadRowActions
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
