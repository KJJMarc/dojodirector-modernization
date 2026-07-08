import {
  DEFAULT_ADMIN_LEAD_HISTORY_SORT,
  parseAdminLeadHistorySort,
  type AdminLeadHistorySort,
} from "@/lib/lead-history-sort.shared";

const STORAGE_VERSION = "v1";
const STORAGE_KEY_PREFIX = "dojo-director.lead-history-sort";

function buildLeadHistorySortStorageKey(clubSlug: string) {
  return `${STORAGE_KEY_PREFIX}.${STORAGE_VERSION}.${clubSlug.trim().toLowerCase()}`;
}

export function readAdminLeadHistorySortFromStorage(clubSlug: string): AdminLeadHistorySort {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_LEAD_HISTORY_SORT;
  }

  try {
    const raw = window.localStorage.getItem(buildLeadHistorySortStorageKey(clubSlug));

    if (!raw) {
      return DEFAULT_ADMIN_LEAD_HISTORY_SORT;
    }

    const parsed = JSON.parse(raw) as { key?: string; dir?: string };

    return parseAdminLeadHistorySort(parsed.key, parsed.dir);
  } catch {
    return DEFAULT_ADMIN_LEAD_HISTORY_SORT;
  }
}

export function writeAdminLeadHistorySortToStorage(
  clubSlug: string,
  sort: AdminLeadHistorySort,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildLeadHistorySortStorageKey(clubSlug),
      JSON.stringify(sort),
    );
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
