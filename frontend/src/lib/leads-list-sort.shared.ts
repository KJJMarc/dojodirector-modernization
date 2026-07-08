import {
  formatLeadProgrammeInterestLabel,
  type AdminLeadListRow,
  type LeadFollowUpStatus,
  type LeadStatus,
} from "@/lib/leads.shared";

export type AdminLeadsListSortDir = "asc" | "desc";

export type AdminLeadsListSortKey =
  | "name"
  | "status"
  | "follow_up_date"
  | "trial_date"
  | "joined_date"
  | "submitted_date"
  | "lead_source"
  | "programme_interest"
  | "last_activity"
  | "last_updated";

export interface AdminLeadsListSort {
  key: AdminLeadsListSortKey;
  dir: AdminLeadsListSortDir;
}

export const ADMIN_LEADS_LIST_SORT_KEYS: AdminLeadsListSortKey[] = [
  "name",
  "status",
  "follow_up_date",
  "trial_date",
  "joined_date",
  "submitted_date",
  "lead_source",
  "programme_interest",
  "last_activity",
  "last_updated",
];

/** Matches the server default before the user chooses a column sort. */
export const DEFAULT_ADMIN_LEADS_LIST_SORT: AdminLeadsListSort = {
  key: "last_activity",
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

export function parseAdminLeadsListSort(
  sortKey: string | null | undefined,
  sortDir: string | null | undefined,
): AdminLeadsListSort {
  const key = ADMIN_LEADS_LIST_SORT_KEYS.includes(sortKey as AdminLeadsListSortKey)
    ? (sortKey as AdminLeadsListSortKey)
    : DEFAULT_ADMIN_LEADS_LIST_SORT.key;

  const dir = sortDir === "asc" || sortDir === "desc" ? sortDir : DEFAULT_ADMIN_LEADS_LIST_SORT.dir;

  return { key, dir };
}

export function getNextAdminLeadsListSortDir(
  currentSort: AdminLeadsListSort,
  columnKey: AdminLeadsListSortKey,
): AdminLeadsListSortDir {
  if (currentSort.key === columnKey) {
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  return "asc";
}

export function parseLeadListNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function resolveLeadTrialSortDate(lead: AdminLeadListRow) {
  return (
    lead.trialBookedAt ??
    lead.linkedTrialSessionStartsAt ??
    lead.trialAttendedAt ??
    null
  );
}

export function resolveLeadFollowUpSortDate(lead: AdminLeadListRow) {
  if (lead.followUpStatus !== "needs_follow_up") {
    return null;
  }

  return lead.contactedAt ?? lead.submittedAt;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, "en-GB", { sensitivity: "base" });
}

function compareOptionalStrings(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = left?.trim() ?? "";
  const normalizedRight = right?.trim() ?? "";

  if (!normalizedLeft && !normalizedRight) {
    return 0;
  }

  if (!normalizedLeft) {
    return 1;
  }

  if (!normalizedRight) {
    return -1;
  }

  return compareStrings(normalizedLeft, normalizedRight);
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

function compareLeadNames(left: AdminLeadListRow, right: AdminLeadListRow) {
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

function compareLeadStatus(left: AdminLeadListRow, right: AdminLeadListRow) {
  const statusCompare =
    LEAD_STATUS_SORT_ORDER[left.status] - LEAD_STATUS_SORT_ORDER[right.status];

  if (statusCompare !== 0) {
    return statusCompare;
  }

  return compareLeadNames(left, right);
}

function compareFollowUpDate(left: AdminLeadListRow, right: AdminLeadListRow) {
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

function compareProgrammeInterest(left: AdminLeadListRow, right: AdminLeadListRow) {
  const programmeCompare = compareStrings(
    formatLeadProgrammeInterestLabel(left.programmeInterest),
    formatLeadProgrammeInterestLabel(right.programmeInterest),
  );

  if (programmeCompare !== 0) {
    return programmeCompare;
  }

  return compareLeadNames(left, right);
}

function compareLeadsByKey(
  left: AdminLeadListRow,
  right: AdminLeadListRow,
  key: AdminLeadsListSortKey,
) {
  switch (key) {
    case "name":
      return compareLeadNames(left, right);
    case "status":
      return compareLeadStatus(left, right);
    case "follow_up_date":
      return compareFollowUpDate(left, right);
    case "trial_date":
      return (
        compareOptionalDates(resolveLeadTrialSortDate(left), resolveLeadTrialSortDate(right)) ||
        compareLeadNames(left, right)
      );
    case "joined_date":
      return compareOptionalDates(left.joinedAt, right.joinedAt) || compareLeadNames(left, right);
    case "submitted_date":
      return compareOptionalDates(left.submittedAt, right.submittedAt) || compareLeadNames(left, right);
    case "lead_source":
      return (
        compareStrings(left.leadSourceLabel, right.leadSourceLabel) ||
        compareLeadNames(left, right)
      );
    case "programme_interest":
      return compareProgrammeInterest(left, right);
    case "last_activity":
      return (
        compareOptionalDates(left.lastActivityAt, right.lastActivityAt) ||
        compareLeadNames(left, right)
      );
    case "last_updated":
      return (
        compareOptionalDates(left.updatedAt, right.updatedAt) || compareLeadNames(left, right)
      );
    default:
      return compareLeadNames(left, right);
  }
}

export function sortAdminLeads(
  leads: AdminLeadListRow[],
  sort: AdminLeadsListSort = DEFAULT_ADMIN_LEADS_LIST_SORT,
): AdminLeadListRow[] {
  const directionMultiplier = sort.dir === "asc" ? 1 : -1;

  return [...leads].sort((left, right) => {
    const comparison = compareLeadsByKey(left, right, sort.key);

    if (comparison !== 0) {
      return comparison * directionMultiplier;
    }

    return compareLeadNames(left, right) * directionMultiplier;
  });
}

export function filterAdminLeads(
  leads: AdminLeadListRow[],
  query?: string,
  statusFilter?: LeadStatus | "all",
): AdminLeadListRow[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const normalizedStatusFilter = statusFilter && statusFilter !== "all" ? statusFilter : null;

  return leads.filter((lead) => {
    if (normalizedStatusFilter && lead.status !== normalizedStatusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const { firstName, lastName } = parseLeadListNameParts(lead.fullName);
    const haystack = [
      lead.fullName,
      firstName,
      lastName,
      lead.email,
      lead.phone ?? "",
      lead.leadSourceLabel,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function applyAdminLeadsListView(input: {
  leads: AdminLeadListRow[];
  sort: AdminLeadsListSort;
  query?: string;
  statusFilter?: LeadStatus | "all";
}) {
  const filtered = filterAdminLeads(input.leads, input.query, input.statusFilter);

  return sortAdminLeads(filtered, input.sort);
}
