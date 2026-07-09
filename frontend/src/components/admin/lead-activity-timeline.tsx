"use client";

import {
  formatLeadActivityTypeLabel,
  type LeadActivity,
} from "@/lib/leads-crm.shared";
import { formatAdminLeadDate } from "@/lib/leads.shared";

interface LeadActivityTimelineProps {
  activities: LeadActivity[];
}

export function LeadActivityTimeline({ activities }: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-6 text-sm text-dojo-muted">
        No activity logged yet. Use the quick actions above to record your first contact.
      </p>
    );
  }

  const sorted = [...activities].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );

  return (
    <ol className="space-y-3">
      {sorted.map((activity) => (
        <li
          key={activity.id}
          className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-dojo-white">
                {formatLeadActivityTypeLabel(activity.activityType)}
              </p>
              {activity.staffDisplayName ? (
                <p className="mt-0.5 text-xs text-dojo-muted">{activity.staffDisplayName}</p>
              ) : activity.direction === "system" ? (
                <p className="mt-0.5 text-xs text-dojo-muted">System</p>
              ) : null}
            </div>
            <time
              className="text-xs text-dojo-muted"
              dateTime={activity.createdAt}
            >
              {formatAdminLeadDate(activity.createdAt)}
            </time>
          </div>
          {activity.body ? (
            <p className="mt-2 text-sm text-dojo-muted">{activity.body}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
