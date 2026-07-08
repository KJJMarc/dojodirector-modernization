import {
  parseLeadListNameParts,
  resolveLeadFollowUpSortDate,
  type AdminLeadsListSortDir,
} from "@/lib/leads-list-sort.shared";
import {
  formatLeadProgrammeInterestLabel,
  type AdminLeadHistoryRow,
  type AdminLeadListRow,
  type LeadFollowUpStatus,
  type LeadStatus,
} from "@/lib/leads.shared";

export type AdminLeadHistorySortDir = AdminLeadsListSortDir;

export type AdminLeadHistorySortKey =
  | "name"
  | "status"
  | "lead_source"
  | "programme_interest"
  | "submitted_date"
  | "trial_date"
  | "trial_attended_date"
  | "joined_date"
  | "follow_up_date"
  | "last_activity";

export interface AdminLeadHistorySort {
  key: AdminLeadHistorySortKey;
  dir: AdminLeadHistorySortDir;
}

export const ADMIN_LEAD_HISTORY_SORT_KEYS: AdminLeadHistorySortKey[] = [
  "name",
  "status",
  "lead_source",
  "programme_interest",
  "submitted_date",
  "trial_date",
  "trial_attended_date",
  "joined_date",
  "follow_up_date",
  "last_activity",
];

export const DEFAULT_ADMIN_LEAD_HISTORY_SORT: AdminLeadHistorySort = {
  key: "submitted_date",
  dir: "desc",
};

const LEAD_STATUS_SORT_ORDER: Record<LeadStatus, number> = {
  new_enquiry: 0,
  trial_booked: 1,
  trial_attended: 2,
  trial_missed: 3,
  joined: 4,
};

const FOLLOW_UP_STATUS_SORT_ORDER: Record<LeadFollowUpStatus, number> = {
  needs_follow_up: 0,
  ok: 1,
};

export function parseAdminLeadHistorySort(
  sortKey: string | null | undefined,
  sortDir: string | null | undefined,
): AdminLeadHistorySort {
  const key = ADMIN_LEAD_HISTORY_SORT_KEYS.includes(sortKey as AdminLeadHistorySortKey)
    ? (sortKey as AdminLeadHistorySortKey)
    : DEFAULT_ADMIN_LEAD_HISTORY_SORT.key;

  const dir =
    sortDir === "asc" || sortDir === "desc" ? sortDir : DEFAULT_ADMIN_LEAD_HISTORY_SORT.dir;

  return { key, dir };
}

export function getNextAdminLeadHistorySortDir(
  currentSort: AdminLeadHistorySort,
  columnKey: AdminLeadHistorySortKey,
): AdminLeadHistorySortDir {
  if (currentSort.key === columnKey) {
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  return "asc";
}

export function resolveLeadTrialBookedDate(lead: AdminLeadListRow) {
  return lead.trialBookedAt ?? lead.linkedTrialSessionStartsAt ?? null;
}

export function resolveLeadFollowUpDisplayDate(lead: AdminLeadListRow) {
  if (lead.contactedAt) {
    return lead.contactedAt;
  }

  return resolveLeadFollowUpSortDate(lead);
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, "en-GB", { sensitivity: "base" });
}

function compareOptionalDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? Date.parse(left) : Number.NaN;
  const rightTime = right ? Date.parse(right) : Number.NaN;
  const leftValid = !Number.isNaN(leftTime);
  const rightValid = !Number.isNaN(rightTime);

  if (!leftValid && !rightValid) {
    return 0;
  }

  if (!leftValid) {
    return 1;
  }

  if (!rightValid) {
    return -1;
  }

  return leftTime - rightTime;
}

function compareLeadNames(left: AdminLeadHistoryRow, right: AdminLeadHistoryRow) {
  const leftName = parseLeadListNameParts(left.fullName);
  const rightName = parseLeadListNameParts(right.fullName);
  const lastNameCompare = compareStrings(leftName.lastName, rightName.lastName);

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  const firstNameCompare = compareStrings(leftName.firstName, rightName.firstName);

  if (firstNameCompare !== 0) {
    return firstNameCompare;
  }

  return compareStrings(left.fullName, right.fullName);
}

function compareLeadStatus(left: AdminLeadHistoryRow, right: AdminLeadHistoryRow) {
  const statusCompare =
    LEAD_STATUS_SORT_ORDER[left.status] - LEAD_STATUS_SORT_ORDER[right.status];

  if (statusCompare !== 0) {
    return statusCompare;
  }

  return compareLeadNames(left, right);
}

function compareFollowUpDate(left: AdminLeadHistoryRow, right: AdminLeadHistoryRow) {
  const followUpStatusCompare =
    FOLLOW_UP_STATUS_SORT_ORDER[left.followUpStatus] -
    FOLLOW_UP_STATUS_SORT_ORDER[right.followUpStatus];

  if (followUpStatusCompare !== 0) {
    return followUpStatusCompare;
  }

  const dateCompare = compareOptionalDates(
    resolveLeadFollowUpSortDate(left),
    resolveLeadFollowUpSortDate(right),
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return compareLeadNames(left, right);
}

function compareProgrammeInterest(left: AdminLeadHistoryRow, right: AdminLeadHistoryRow) {
  const programmeCompare = compareStrings(
    formatLeadProgrammeInterestLabel(left.programmeInterest),
    formatLeadProgrammeInterestLabel(right.programmeInterest),
  );

  if (programmeCompare !== 0) {
    return programmeCompare;
  }

  return compareLeadNames(left, right);
}

function compareArchived(left: AdminLeadHistoryRow, right: AdminLeadHistoryRow) {
  const leftArchived = Boolean(left.archivedAt);
  const rightArchived = Boolean(right.archivedAt);

  if (leftArchived === rightArchived) {
    return 0;
  }

  return leftArchived ? 1 : -1;
}

function compareLeadsByKey(
  left: AdminLeadHistoryRow,
  right: AdminLeadHistoryRow,
  key: AdminLeadHistorySortKey,
) {
  switch (key) {
    case "name":
      return compareLeadNames(left, right);
    case "status":
      return compareLeadStatus(left, right) || compareArchived(left, right);
    case "lead_source":
      return (
        compareStrings(left.leadSourceLabel, right.leadSourceLabel) ||
        compareLeadNames(left, right)
      );
    case "programme_interest":
      return compareProgrammeInterest(left, right);
    case "submitted_date":
      return (
        compareOptionalDates(left.submittedAt, right.submittedAt) || compareLeadNames(left, right)
      );
    case "trial_date":
      return (
        compareOptionalDates(resolveLeadTrialBookedDate(left), resolveLeadTrialBookedDate(right)) ||
        compareLeadNames(left, right)
      );
    case "trial_attended_date":
      return (
        compareOptionalDates(left.trialAttendedAt, right.trialAttendedAt) ||
        compareLeadNames(left, right)
      );
    case "joined_date":
      return compareOptionalDates(left.joinedAt, right.joinedAt) || compareLeadNames(left, right);
    case "follow_up_date":
      return compareFollowUpDate(left, right);
    case "last_activity":
      return (
        compareOptionalDates(left.lastActivityAt, right.lastActivityAt) ||
        compareLeadNames(left, right)
      );
    default:
      return compareLeadNames(left, right);
  }
}

export function sortAdminLeadHistory(
  leads: AdminLeadHistoryRow[],
  sort: AdminLeadHistorySort = DEFAULT_ADMIN_LEAD_HISTORY_SORT,
): AdminLeadHistoryRow[] {
  const directionMultiplier = sort.dir === "asc" ? 1 : -1;

  return [...leads].sort((left, right) => {
    const comparison = compareLeadsByKey(left, right, sort.key);

    if (comparison !== 0) {
      return comparison * directionMultiplier;
    }

    return compareLeadNames(left, right) * directionMultiplier;
  });
}

export function filterAdminLeadHistory(
  leads: AdminLeadHistoryRow[],
  query?: string,
): AdminLeadHistoryRow[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? "";

  if (!normalizedQuery) {
    return leads;
  }

  return leads.filter((lead) => {
    const { firstName, lastName } = parseLeadListNameParts(lead.fullName);
    const haystack = [
      lead.fullName,
      firstName,
      lastName,
      lead.email,
      lead.phone ?? "",
      lead.leadSourceLabel,
      formatLeadProgrammeInterestLabel(lead.programmeInterest),
      lead.statusLabel,
      lead.archivedAt ? "archived" : "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function applyAdminLeadHistoryView(input: {
  leads: AdminLeadHistoryRow[];
  sort: AdminLeadHistorySort;
  query?: string;
}) {
  const filtered = filterAdminLeadHistory(input.leads, input.query);

  return sortAdminLeadHistory(filtered, input.sort);
}
