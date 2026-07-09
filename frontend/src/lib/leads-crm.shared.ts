import {
  addLondonCalendarDays,
  daysBetweenLondonDateKeys,
  getLondonTodayDateKey,
  utcIsoToLondonDate,
} from "@/lib/london-datetime";
import {
  buildWorkflowFollowUpBanner,
  getActiveWorkflowStagesForStatus,
  resolveCurrentWorkflowStage,
} from "@/lib/lead-workflow.shared";
import type { AdminLeadListRow, LeadStatus } from "@/lib/leads.shared";
import { formatAdminLeadDate } from "@/lib/leads.shared";

export const LEAD_ACTIVITY_TYPES = [
  "enquiry_received",
  "welcome_email",
  "email_sent",
  "phone_call",
  "sms",
  "whatsapp",
  "social_message",
  "voicemail",
  "spoke_to_parent",
  "note",
  "reply_received",
  "trial_booked",
  "trial_attended",
  "trial_missed",
  "joined",
  "archived",
  "status_change",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const MANUAL_LEAD_ACTIVITY_TYPES = [
  "email_sent",
  "phone_call",
  "sms",
  "whatsapp",
  "social_message",
  "voicemail",
  "spoke_to_parent",
  "note",
  "reply_received",
] as const;

export type ManualLeadActivityType = (typeof MANUAL_LEAD_ACTIVITY_TYPES)[number];

export const QUICK_LEAD_ACTIVITY_TYPES = [
  "email_sent",
  "phone_call",
  "note",
] as const satisfies readonly ManualLeadActivityType[];

export type LeadActivityDirection = "outbound" | "inbound" | "system";

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: LeadActivityType;
  direction: LeadActivityDirection;
  body: string | null;
  staffUserId: string | null;
  staffDisplayName: string | null;
  followUpAt: string | null;
  createdAt: string;
}

export interface AcademyLeadWorkflowStage {
  key: string;
  label: string;
  triggerDaysAfter: number;
  triggerDaysAfterMax?: number;
  appliesToStatuses?: LeadStatus[];
  recommendedActionLabel: string;
  isActive: boolean;
}

export interface AcademyLeadWorkflow {
  academyId: string;
  name: string;
  stages: AcademyLeadWorkflowStage[];
  archiveAfterDays: number | null;
  recommendArchiveAfterFinalStage: boolean;
  updatedAt: string;
}

/** Generic default template — copied into each academy's workflow row, never referenced by slug. */
export const DEFAULT_ACADEMY_LEAD_WORKFLOW_STAGES: AcademyLeadWorkflowStage[] = [
  {
    key: "initial_response",
    label: "Initial response",
    triggerDaysAfter: 0,
    appliesToStatuses: ["new_enquiry"],
    recommendedActionLabel: "Send initial response",
    isActive: true,
  },
  {
    key: "follow_up_1",
    label: "Follow-up 1",
    triggerDaysAfter: 3,
    triggerDaysAfterMax: 5,
    appliesToStatuses: ["new_enquiry"],
    recommendedActionLabel: "Send follow-up 1",
    isActive: true,
  },
  {
    key: "follow_up_2",
    label: "Follow-up 2",
    triggerDaysAfter: 10,
    triggerDaysAfterMax: 14,
    appliesToStatuses: ["new_enquiry"],
    recommendedActionLabel: "Send follow-up 2",
    isActive: true,
  },
  {
    key: "final_follow_up",
    label: "Final follow-up",
    triggerDaysAfter: 30,
    appliesToStatuses: ["new_enquiry", "trial_missed"],
    recommendedActionLabel: "Send final follow-up",
    isActive: true,
  },
];

export function buildDefaultAcademyLeadWorkflow(academyId: string): AcademyLeadWorkflow {
  return {
    academyId,
    name: "Default follow-up",
    stages: DEFAULT_ACADEMY_LEAD_WORKFLOW_STAGES.map((stage) => ({ ...stage })),
    archiveAfterDays: 30,
    recommendArchiveAfterFinalStage: true,
    updatedAt: new Date().toISOString(),
  };
}

export const LEAD_HEALTH_STATES = [
  "healthy",
  "waiting",
  "follow_up_due",
  "overdue",
  "closed",
] as const;

export type LeadHealth = (typeof LEAD_HEALTH_STATES)[number];

export const LEAD_HEALTH_SORT_ORDER: Record<LeadHealth, number> = {
  overdue: 0,
  follow_up_due: 1,
  waiting: 2,
  healthy: 3,
  closed: 4,
};

export const LEAD_HEALTH_LABELS: Record<LeadHealth, string> = {
  healthy: "Healthy",
  waiting: "Waiting",
  follow_up_due: "Follow-up due",
  overdue: "Overdue",
  closed: "Closed",
};

export interface LeadHealthResult {
  health: LeadHealth;
  healthLabel: string;
  bannerLabel: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  contactAttempts: number;
  hasOutboundContact: boolean;
}

export interface AdminLeadCrmRow extends AdminLeadListRow {
  leadHealth: LeadHealth;
  healthLabel: string;
  bannerLabel: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  contactAttempts: number;
  hasOutboundContact: boolean;
}

export interface ActiveLeadsDashboardSummary {
  needsFollowUpToday: number;
  overdue: number;
  bookedThisWeek: number;
  joinedThisMonth: number;
  noContactMade: number;
  awaitingTrial: number;
}

export type ActiveLeadsQuickFilter =
  | "all"
  | "needs_follow_up_today"
  | "overdue"
  | "waiting_for_reply"
  | "booked_trial"
  | "booked_this_week"
  | "awaiting_trial"
  | "trial_attended"
  | "joined"
  | "joined_this_month"
  | "no_contact_yet"
  | "no_activity_14_days";

export const ACTIVE_LEADS_QUICK_FILTERS: {
  key: ActiveLeadsQuickFilter;
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "needs_follow_up_today", label: "Needs follow-up today" },
  { key: "overdue", label: "Overdue" },
  { key: "waiting_for_reply", label: "Waiting for reply" },
  { key: "booked_trial", label: "Booked trial" },
  { key: "awaiting_trial", label: "Awaiting trial" },
  { key: "trial_attended", label: "Trial attended" },
  { key: "joined", label: "Joined" },
  { key: "no_contact_yet", label: "No contact yet" },
  { key: "no_activity_14_days", label: "No activity in 14 days" },
];

export const DEFAULT_ACTIVE_LEADS_QUICK_FILTER: ActiveLeadsQuickFilter = "all";

const OUTBOUND_CONTACT_ACTIVITY_TYPES = new Set<LeadActivityType>([
  "email_sent",
  "phone_call",
  "sms",
  "whatsapp",
  "social_message",
  "voicemail",
  "spoke_to_parent",
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * ONE_DAY_MS;

export function formatLeadActivityTypeLabel(activityType: LeadActivityType) {
  switch (activityType) {
    case "enquiry_received":
      return "Website enquiry";
    case "welcome_email":
      return "Automatic welcome email";
    case "email_sent":
      return "Email sent";
    case "phone_call":
      return "Phone call";
    case "sms":
      return "SMS";
    case "whatsapp":
      return "WhatsApp";
    case "social_message":
      return "Social message";
    case "voicemail":
      return "Left voicemail";
    case "spoke_to_parent":
      return "Spoke to parent";
    case "note":
      return "Note";
    case "reply_received":
      return "Reply received";
    case "trial_booked":
      return "Trial booked";
    case "trial_attended":
      return "Trial attended";
    case "trial_missed":
      return "Trial missed";
    case "joined":
      return "Joined";
    case "archived":
      return "Archived";
    case "status_change":
      return "Status updated";
    default:
      return activityType;
  }
}

export function isOutboundContactActivityType(activityType: LeadActivityType) {
  return OUTBOUND_CONTACT_ACTIVITY_TYPES.has(activityType);
}

export function isManualLeadActivityType(
  activityType: string,
): activityType is ManualLeadActivityType {
  return (MANUAL_LEAD_ACTIVITY_TYPES as readonly string[]).includes(activityType);
}

export function resolveActivityDirectionForManualType(
  activityType: ManualLeadActivityType,
): LeadActivityDirection {
  return activityType === "reply_received" ? "inbound" : "outbound";
}

function sortActivitiesNewestFirst(activities: LeadActivity[]) {
  return [...activities].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function getLatestOutboundContactActivity(activities: LeadActivity[]) {
  return sortActivitiesNewestFirst(activities).find((activity) =>
    isOutboundContactActivityType(activity.activityType),
  );
}

export function getLatestInboundActivity(activities: LeadActivity[]) {
  return sortActivitiesNewestFirst(activities).find(
    (activity) => activity.direction === "inbound",
  );
}

export function countOutboundContactAttempts(activities: LeadActivity[]) {
  return activities.filter((activity) => isOutboundContactActivityType(activity.activityType))
    .length;
}

export function resolveLastContactedAt(
  lead: Pick<AdminLeadListRow, "contactedAt">,
  activities: LeadActivity[],
) {
  const latestOutbound = getLatestOutboundContactActivity(activities);

  if (latestOutbound) {
    return latestOutbound.createdAt;
  }

  return lead.contactedAt;
}

function shouldRecommendArchive(input: {
  lead: AdminLeadListRow;
  activities: LeadActivity[];
  workflow: AcademyLeadWorkflow;
  now: Date;
}) {
  if (!input.workflow.recommendArchiveAfterFinalStage || !input.workflow.archiveAfterDays) {
    return false;
  }

  const activeStages = getActiveWorkflowStagesForStatus(input.workflow, input.lead.status);

  if (activeStages.length === 0) {
    return false;
  }

  const outboundAttempts = countOutboundContactAttempts(input.activities);
  const pastAllStages = outboundAttempts >= activeStages.length;
  const anchorDateKey = utcIsoToLondonDate(input.lead.submittedAt);
  const archiveDueDateKey = addLondonCalendarDays(anchorDateKey, input.workflow.archiveAfterDays);
  const todayKey = getLondonTodayDateKey(input.now);

  return pastAllStages && daysBetweenLondonDateKeys(archiveDueDateKey, todayKey) >= 0;
}

export function computeNextWorkflowFollowUpAt(
  lead: AdminLeadListRow,
  activities: LeadActivity[],
  workflow: AcademyLeadWorkflow,
  now = new Date(),
): string | null {
  if (lead.status === "joined" || lead.status === "trial_attended") {
    return null;
  }

  if (
    lead.status === "trial_booked" &&
    lead.linkedTrialSessionStartsAt &&
    Date.parse(lead.linkedTrialSessionStartsAt) > now.getTime()
  ) {
    return null;
  }

  const stages = getActiveWorkflowStagesForStatus(workflow, lead.status);

  if (stages.length === 0) {
    return null;
  }

  const anchorDateKey = utcIsoToLondonDate(lead.submittedAt);
  const outboundAttempts = countOutboundContactAttempts(activities);
  const stage = resolveCurrentWorkflowStage({
    workflow,
    status: lead.status,
    outboundContactAttempts: outboundAttempts,
  });

  if (!stage) {
    return null;
  }

  const dueDateKey = addLondonCalendarDays(anchorDateKey, stage.triggerDaysAfter);
  return `${dueDateKey}T09:00:00.000Z`;
}

function isFutureTrialSession(
  lead: AdminLeadListRow,
  now: Date,
) {
  return Boolean(
    lead.status === "trial_booked" &&
      lead.linkedTrialSessionStartsAt &&
      Date.parse(lead.linkedTrialSessionStartsAt) > now.getTime(),
  );
}

function formatTrialBanner(lead: AdminLeadListRow, now: Date) {
  if (!lead.linkedTrialSessionStartsAt) {
    return "Waiting for trial";
  }

  const sessionDateKey = utcIsoToLondonDate(lead.linkedTrialSessionStartsAt);
  const todayKey = getLondonTodayDateKey(now);
  const tomorrowKey = addLondonCalendarDays(todayKey, 1);

  if (sessionDateKey === todayKey) {
    return "Trial today";
  }

  if (sessionDateKey === tomorrowKey) {
    return "Trial tomorrow";
  }

  return `Trial ${formatAdminLeadDate(lead.linkedTrialSessionStartsAt)}`;
}

function formatJoinedThisWeekBanner(lead: AdminLeadListRow, now: Date) {
  if (lead.status !== "joined" || !lead.joinedAt) {
    return null;
  }

  const joinedDateKey = utcIsoToLondonDate(lead.joinedAt);
  const todayKey = getLondonTodayDateKey(now);
  const daysSinceJoined = daysBetweenLondonDateKeys(joinedDateKey, todayKey);

  if (daysSinceJoined >= 0 && daysSinceJoined <= 7) {
    return "Joined this week";
  }

  return null;
}

export function computeLeadHealth(input: {
  lead: AdminLeadListRow;
  activities: LeadActivity[];
  workflow: AcademyLeadWorkflow;
  now?: Date;
}): LeadHealthResult {
  const now = input.now ?? new Date();
  const { lead, activities, workflow } = input;
  const lastContactedAt = resolveLastContactedAt(lead, activities);
  const contactAttempts = countOutboundContactAttempts(activities);
  const hasOutboundContact = contactAttempts > 0;
  const nextFollowUpAt = computeNextWorkflowFollowUpAt(lead, activities, workflow, now);
  const latestOutbound = getLatestOutboundContactActivity(activities);
  const latestInbound = getLatestInboundActivity(activities);
  const currentStage = resolveCurrentWorkflowStage({
    workflow,
    status: lead.status,
    outboundContactAttempts: contactAttempts,
  });
  const recommendArchive = shouldRecommendArchive({ lead, activities, workflow, now });

  if (recommendArchive) {
    return {
      health: "overdue",
      healthLabel: LEAD_HEALTH_LABELS.overdue,
      bannerLabel: buildWorkflowFollowUpBanner({
        stage: currentStage,
        daysUntilDue: 0,
        overdueDays: 0,
        recommendArchive: true,
      }),
      nextFollowUpAt,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  if (lead.status === "joined") {
    return {
      health: "closed",
      healthLabel: LEAD_HEALTH_LABELS.closed,
      bannerLabel: formatJoinedThisWeekBanner(lead, now),
      nextFollowUpAt: null,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  if (isFutureTrialSession(lead, now)) {
    return {
      health: "healthy",
      healthLabel: LEAD_HEALTH_LABELS.healthy,
      bannerLabel: formatTrialBanner(lead, now),
      nextFollowUpAt: null,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  if (lead.status === "trial_attended") {
    return {
      health: "healthy",
      healthLabel: LEAD_HEALTH_LABELS.healthy,
      bannerLabel: "Trial attended — ready to join",
      nextFollowUpAt: null,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  if (nextFollowUpAt) {
    const dueDateKey = utcIsoToLondonDate(nextFollowUpAt);
    const todayKey = getLondonTodayDateKey(now);
    const daysUntilDue = daysBetweenLondonDateKeys(todayKey, dueDateKey);
    const contactedAfterDue =
      latestOutbound && Date.parse(latestOutbound.createdAt) >= Date.parse(nextFollowUpAt);

    if (!contactedAfterDue) {
      if (daysUntilDue < 0) {
        const overdueDays = Math.abs(daysUntilDue);

        return {
          health: "overdue",
          healthLabel: LEAD_HEALTH_LABELS.overdue,
          bannerLabel: buildWorkflowFollowUpBanner({
            stage: currentStage,
            daysUntilDue,
            overdueDays,
            recommendArchive: false,
          }),
          nextFollowUpAt,
          lastContactedAt,
          contactAttempts,
          hasOutboundContact,
        };
      }

      if (daysUntilDue === 0) {
        return {
          health: "follow_up_due",
          healthLabel: LEAD_HEALTH_LABELS.follow_up_due,
          bannerLabel: buildWorkflowFollowUpBanner({
            stage: currentStage,
            daysUntilDue,
            overdueDays: 0,
            recommendArchive: false,
          }),
          nextFollowUpAt,
          lastContactedAt,
          contactAttempts,
          hasOutboundContact,
        };
      }
    }
  }

  if (
    latestOutbound &&
    (!latestInbound || Date.parse(latestInbound.createdAt) < Date.parse(latestOutbound.createdAt))
  ) {
    return {
      health: "waiting",
      healthLabel: LEAD_HEALTH_LABELS.waiting,
      bannerLabel: "Waiting for their reply",
      nextFollowUpAt,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  if (lead.status === "trial_missed" || lead.followUpStatus === "needs_follow_up") {
    return {
      health: "follow_up_due",
      healthLabel: LEAD_HEALTH_LABELS.follow_up_due,
      bannerLabel: buildWorkflowFollowUpBanner({
        stage: currentStage,
        daysUntilDue: 0,
        overdueDays: 0,
        recommendArchive: false,
      }),
      nextFollowUpAt,
      lastContactedAt,
      contactAttempts,
      hasOutboundContact,
    };
  }

  return {
    health: "healthy",
    healthLabel: LEAD_HEALTH_LABELS.healthy,
    bannerLabel: hasOutboundContact ? "Progressing" : null,
    nextFollowUpAt,
    lastContactedAt,
    contactAttempts,
    hasOutboundContact,
  };
}

export function enrichLeadWithCrmFields(input: {
  lead: AdminLeadListRow;
  activities: LeadActivity[];
  workflow: AcademyLeadWorkflow;
  now?: Date;
}): AdminLeadCrmRow {
  const health = computeLeadHealth(input);

  return {
    ...input.lead,
    leadHealth: health.health,
    healthLabel: health.healthLabel,
    bannerLabel: health.bannerLabel,
    lastContactedAt: health.lastContactedAt,
    nextFollowUpAt: health.nextFollowUpAt,
    contactAttempts: health.contactAttempts,
    hasOutboundContact: health.hasOutboundContact,
  };
}

function isInCurrentWeekLondon(iso: string | null, now: Date) {
  if (!iso) {
    return false;
  }

  const dateKey = utcIsoToLondonDate(iso);
  const todayKey = getLondonTodayDateKey(now);
  const daysFromToday = daysBetweenLondonDateKeys(dateKey, todayKey);

  return daysFromToday >= 0 && daysFromToday <= 6;
}

export function buildActiveLeadsDashboardSummary(
  leads: AdminLeadCrmRow[],
  now = new Date(),
): ActiveLeadsDashboardSummary {
  const todayKey = getLondonTodayDateKey(now);

  return {
    needsFollowUpToday: leads.filter((lead) => {
      if (!lead.nextFollowUpAt) {
        return lead.leadHealth === "follow_up_due";
      }

      return utcIsoToLondonDate(lead.nextFollowUpAt) === todayKey;
    }).length,
    overdue: leads.filter((lead) => lead.leadHealth === "overdue").length,
    bookedThisWeek: leads.filter(
      (lead) =>
        lead.status === "trial_booked" &&
        isInCurrentWeekLondon(lead.linkedTrialSessionStartsAt ?? lead.trialBookedAt, now),
    ).length,
    joinedThisMonth: leads.filter((lead) => {
      if (lead.status !== "joined" || !lead.joinedAt) {
        return false;
      }

      const joinedMonth = utcIsoToLondonDate(lead.joinedAt).slice(0, 7);
      const currentMonth = todayKey.slice(0, 7);

      return joinedMonth === currentMonth;
    }).length,
    noContactMade: leads.filter(
      (lead) => lead.status === "new_enquiry" && !lead.hasOutboundContact,
    ).length,
    awaitingTrial: leads.filter((lead) => isFutureTrialSession(lead, now)).length,
  };
}

export function applyActiveLeadsQuickFilter(
  leads: AdminLeadCrmRow[],
  filter: ActiveLeadsQuickFilter = DEFAULT_ACTIVE_LEADS_QUICK_FILTER,
  now = new Date(),
): AdminLeadCrmRow[] {
  if (filter === "all") {
    return leads;
  }

  const todayKey = getLondonTodayDateKey(now);
  const staleCutoff = now.getTime() - FOURTEEN_DAYS_MS;

  return leads.filter((lead) => {
    switch (filter) {
      case "needs_follow_up_today":
        return (
          lead.leadHealth === "follow_up_due" &&
          (!lead.nextFollowUpAt || utcIsoToLondonDate(lead.nextFollowUpAt) === todayKey)
        );
      case "overdue":
        return lead.leadHealth === "overdue";
      case "waiting_for_reply":
        return lead.leadHealth === "waiting";
      case "booked_trial":
        return lead.status === "trial_booked";
      case "booked_this_week":
        return (
          lead.status === "trial_booked" &&
          isInCurrentWeekLondon(lead.linkedTrialSessionStartsAt ?? lead.trialBookedAt, now)
        );
      case "awaiting_trial":
        return isFutureTrialSession(lead, now);
      case "trial_attended":
        return lead.status === "trial_attended";
      case "joined":
        return lead.status === "joined";
      case "joined_this_month": {
        if (lead.status !== "joined" || !lead.joinedAt) {
          return false;
        }

        const joinedMonth = utcIsoToLondonDate(lead.joinedAt).slice(0, 7);
        const currentMonth = getLondonTodayDateKey(now).slice(0, 7);

        return joinedMonth === currentMonth;
      }
      case "no_contact_yet":
        return !lead.hasOutboundContact;
      case "no_activity_14_days":
        return Date.parse(lead.lastActivityAt) < staleCutoff;
      default:
        return true;
    }
  });
}

export function buildLeadContactSummary(activities: LeadActivity[]) {
  const emailsSent = activities.filter((activity) =>
    ["email_sent", "welcome_email"].includes(activity.activityType),
  ).length;
  const callsMade = activities.filter((activity) =>
    ["phone_call", "voicemail", "spoke_to_parent"].includes(activity.activityType),
  ).length;
  const messagesSent = activities.filter((activity) =>
    ["sms", "whatsapp", "social_message"].includes(activity.activityType),
  ).length;
  const latestOutbound = getLatestOutboundContactActivity(activities);

  return {
    emailsSent,
    callsMade,
    messagesSent,
    totalContactAttempts: countOutboundContactAttempts(activities),
    lastContactedAt: latestOutbound?.createdAt ?? null,
  };
}
