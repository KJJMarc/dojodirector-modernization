import {
  DEFAULT_ACTIVE_LEADS_CRM_SORT,
  parseActiveLeadsCrmSort,
  type ActiveLeadsCrmSort,
} from "@/lib/leads-crm-list-sort.shared";

const STORAGE_VERSION = "v1";
const STORAGE_KEY_PREFIX = "dojo-director.active-leads-crm-sort";

function buildStorageKey(clubSlug: string) {
  return `${STORAGE_KEY_PREFIX}.${STORAGE_VERSION}.${clubSlug.trim().toLowerCase()}`;
}

export function readActiveLeadsCrmSortFromStorage(clubSlug: string): ActiveLeadsCrmSort {
  if (typeof window === "undefined") {
    return DEFAULT_ACTIVE_LEADS_CRM_SORT;
  }

  try {
    const raw = window.localStorage.getItem(buildStorageKey(clubSlug));

    if (!raw) {
      return DEFAULT_ACTIVE_LEADS_CRM_SORT;
    }

    const parsed = JSON.parse(raw) as { key?: string; dir?: string };

    return parseActiveLeadsCrmSort(parsed.key, parsed.dir);
  } catch {
    return DEFAULT_ACTIVE_LEADS_CRM_SORT;
  }
}

export function writeActiveLeadsCrmSortToStorage(
  clubSlug: string,
  sort: ActiveLeadsCrmSort,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(buildStorageKey(clubSlug), JSON.stringify(sort));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
