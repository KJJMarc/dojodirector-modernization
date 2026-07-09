"use client";

import type { LeadHealth } from "@/lib/leads-crm.shared";

const HEALTH_DOT_CLASS: Record<LeadHealth, string> = {
  healthy: "bg-emerald-400",
  waiting: "bg-amber-300",
  follow_up_due: "bg-orange-400",
  overdue: "bg-red-500",
  closed: "bg-dojo-muted",
};

const HEALTH_TEXT_CLASS: Record<LeadHealth, string> = {
  healthy: "text-emerald-200",
  waiting: "text-amber-200",
  follow_up_due: "text-orange-200",
  overdue: "text-red-300",
  closed: "text-dojo-muted",
};

interface LeadHealthIndicatorProps {
  health: LeadHealth;
  label: string;
  compact?: boolean;
}

export function LeadHealthIndicator({ health, label, compact = false }: LeadHealthIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH_DOT_CLASS[health]}`}
        aria-hidden="true"
      />
      <span className={`font-medium ${HEALTH_TEXT_CLASS[health]}`}>{label}</span>
    </span>
  );
}
