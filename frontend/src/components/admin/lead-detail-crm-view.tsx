"use client";

import { useRouter } from "next/navigation";
import { LeadActivityTimeline } from "@/components/admin/lead-activity-timeline";
import { LeadDetailView } from "@/components/admin/lead-detail-view";
import { LeadHealthIndicator } from "@/components/admin/lead-health-indicator";
import { LeadQuickActivityPanel } from "@/components/admin/lead-quick-activity-panel";
import type { LeadActivity } from "@/lib/leads-crm.shared";
import type { AdminLeadDetail } from "@/lib/leads.shared";

interface LeadDetailCrmViewProps {
  clubSlug: string;
  lead: AdminLeadDetail;
  activities: LeadActivity[];
  healthLabel: string;
  health: import("@/lib/leads-crm.shared").LeadHealth;
  bannerLabel: string | null;
  crmAvailable: boolean;
  crmSetupMessage: string | null;
}

export function LeadDetailCrmView({
  clubSlug,
  lead,
  activities,
  health,
  healthLabel,
  bannerLabel,
  crmAvailable,
  crmSetupMessage,
}: LeadDetailCrmViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {crmSetupMessage ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {crmSetupMessage}
        </section>
      ) : null}

      {crmAvailable ? (
        <>
          <div className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3">
            <LeadHealthIndicator health={health} label={healthLabel} />
          </div>

          <LeadQuickActivityPanel
            clubSlug={clubSlug}
            leadId={lead.id}
            activities={activities}
            bannerLabel={bannerLabel}
            onActivityLogged={() => router.refresh()}
          />

          <LeadActivityTimeline activities={activities} />
        </>
      ) : null}

      <LeadDetailView clubSlug={clubSlug} lead={lead} />
    </div>
  );
}
