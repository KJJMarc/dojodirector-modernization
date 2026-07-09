import Link from "next/link";
import {
  clubLeadEmailSettingsAdminPath,
  clubLeadNewAdminPath,
  clubLeadWorkflowSettingsAdminPath,
  clubLeadsArchivedAdminPath,
  clubLeadsHistoryAdminPath,
  clubLeadsListAdminPath,
} from "@/lib/leads.shared";

interface LeadsAreaCardsProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

export function LeadsAreaCards({ clubSlug }: LeadsAreaCardsProps) {
  return (
    <div className="grid gap-3">
      <Link href={clubLeadsListAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Active Leads</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          List trial enquiries for this academy, most recent activity first.
        </span>
      </Link>

      <Link href={clubLeadsHistoryAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Lead History</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          View all leads ever recorded, including joined and archived leads.
        </span>
      </Link>

      <Link href={clubLeadNewAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Add Lead</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          Manually record a phone, walk-in or referral enquiry.
        </span>
      </Link>

      <Link href={clubLeadsArchivedAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Archived Leads</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          View archived leads and restore them if required.
        </span>
      </Link>

      <Link href={clubLeadWorkflowSettingsAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Lead Workflow Settings</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          Configure follow-up stages, timings and recommendations.
        </span>
      </Link>

      <Link href={clubLeadEmailSettingsAdminPath(clubSlug)} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Lead Email Settings</span>
        <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
          Lead notification and acknowledgement email options (coming soon).
        </span>
      </Link>
    </div>
  );
}
