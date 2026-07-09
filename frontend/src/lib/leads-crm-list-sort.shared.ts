import {
  applyActiveLeadsQuickFilter,
  LEAD_HEALTH_SORT_ORDER,
  type ActiveLeadsQuickFilter,
  type AdminLeadCrmRow,
} from "@/lib/leads-crm.shared";
import {
  filterAdminLeads,
  parseLeadListNameParts,
  sortAdminLeads,
  type AdminLeadsListSort,
  type AdminLeadsListSortDir,
  type AdminLeadsListSortKey,
} from "@/lib/leads-list-sort.shared";

export type ActiveLeadsCrmSortKey =
  | AdminLeadsListSortKey
  | "lead_health"
  | "last_contact"
  | "next_follow_up"
  | "contact_attempts";

export interface ActiveLeadsCrmSort {
  key: ActiveLeadsCrmSortKey;
  dir: AdminLeadsListSortDir;
}

export const ACTIVE_LEADS_CRM_SORT_KEYS: ActiveLeadsCrmSortKey[] = [
  "lead_health",
  "name",
  "status",
  "last_contact",
  "next_follow_up",
  "contact_attempts",
  "trial_date",
  "last_activity",
];

export const DEFAULT_ACTIVE_LEADS_CRM_SORT: ActiveLeadsCrmSort = {
  key: "lead_health",
  dir: "asc",
};

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

function compareLeadNames(left: AdminLeadCrmRow, right: AdminLeadCrmRow) {
  const leftName = parseLeadListNameParts(left.fullName);
  const rightName = parseLeadListNameParts(right.fullName);
  const lastNameCompare = leftName.lastName.localeCompare(rightName.lastName, "en-GB", {
    sensitivity: "base",
  });

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return leftName.firstName.localeCompare(rightName.firstName, "en-GB", {
    sensitivity: "base",
  });
}

function compareCrmLeads(left: AdminLeadCrmRow, right: AdminLeadCrmRow, key: ActiveLeadsCrmSortKey) {
  switch (key) {
    case "lead_health": {
      const healthCompare =
        LEAD_HEALTH_SORT_ORDER[left.leadHealth] - LEAD_HEALTH_SORT_ORDER[right.leadHealth];

      return (
        healthCompare ||
        compareOptionalDates(left.nextFollowUpAt, right.nextFollowUpAt) ||
        compareLeadNames(left, right)
      );
    }
    case "last_contact":
      return (
        compareOptionalDates(left.lastContactedAt, right.lastContactedAt) ||
        compareLeadNames(left, right)
      );
    case "next_follow_up":
      return (
        compareOptionalDates(left.nextFollowUpAt, right.nextFollowUpAt) ||
        compareLeadNames(left, right)
      );
    case "contact_attempts":
      return left.contactAttempts - right.contactAttempts || compareLeadNames(left, right);
    default:
      return 0;
  }
}

export function sortActiveLeadsCrm(
  leads: AdminLeadCrmRow[],
  sort: ActiveLeadsCrmSort = DEFAULT_ACTIVE_LEADS_CRM_SORT,
): AdminLeadCrmRow[] {
  const isCrmKey = ["lead_health", "last_contact", "next_follow_up", "contact_attempts"].includes(
    sort.key,
  );

  if (!isCrmKey) {
    return sortAdminLeads(leads, sort as AdminLeadsListSort) as AdminLeadCrmRow[];
  }

  const directionMultiplier = sort.dir === "asc" ? 1 : -1;

  return [...leads].sort((left, right) => {
    const comparison = compareCrmLeads(left, right, sort.key);

    if (comparison !== 0) {
      return comparison * directionMultiplier;
    }

    return compareLeadNames(left, right) * directionMultiplier;
  });
}

export function applyActiveLeadsCrmListView(input: {
  leads: AdminLeadCrmRow[];
  sort: ActiveLeadsCrmSort;
  query?: string;
  quickFilter?: ActiveLeadsQuickFilter;
}) {
  const filteredByQuick = applyActiveLeadsQuickFilter(
    input.leads,
    input.quickFilter ?? "all",
  );
  const filtered = filterAdminLeads(filteredByQuick, input.query) as AdminLeadCrmRow[];

  return sortActiveLeadsCrm(filtered, input.sort);
}

export function getNextActiveLeadsCrmSortDir(
  currentSort: ActiveLeadsCrmSort,
  columnKey: ActiveLeadsCrmSortKey,
): AdminLeadsListSortDir {
  if (currentSort.key === columnKey) {
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  return columnKey === "lead_health" || columnKey === "next_follow_up" ? "asc" : "desc";
}

export function parseActiveLeadsCrmSort(
  sortKey: string | null | undefined,
  sortDir: string | null | undefined,
): ActiveLeadsCrmSort {
  const key = ACTIVE_LEADS_CRM_SORT_KEYS.includes(sortKey as ActiveLeadsCrmSortKey)
    ? (sortKey as ActiveLeadsCrmSortKey)
    : DEFAULT_ACTIVE_LEADS_CRM_SORT.key;
  const dir =
    sortDir === "asc" || sortDir === "desc" ? sortDir : DEFAULT_ACTIVE_LEADS_CRM_SORT.dir;

  return { key, dir };
}
