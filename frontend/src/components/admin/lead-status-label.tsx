import { LEAD_TRIAL_ATTENDANCE_PENDING_TOOLTIP } from "@/lib/leads.shared";

interface LeadStatusLabelProps {
  statusLabel: string;
  showTrialAttendancePendingWarning?: boolean;
}

export function LeadStatusLabel({
  statusLabel,
  showTrialAttendancePendingWarning = false,
}: LeadStatusLabelProps) {
  if (!showTrialAttendancePendingWarning) {
    return <>{statusLabel}</>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{statusLabel}</span>
      <span
        className="cursor-default text-xs leading-none text-dojo-amber-400/80"
        title={LEAD_TRIAL_ATTENDANCE_PENDING_TOOLTIP}
        aria-label={LEAD_TRIAL_ATTENDANCE_PENDING_TOOLTIP}
        role="img"
      >
        ⚠
      </span>
    </span>
  );
}
