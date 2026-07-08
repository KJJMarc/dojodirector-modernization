import {
  DEFAULT_ADMIN_LEADS_LIST_SORT,
  parseAdminLeadsListSort,
  type AdminLeadsListSort,
} from "@/lib/leads-list-sort.shared";

const STORAGE_VERSION = "v1";
const STORAGE_KEY_PREFIX = "dojo-director.leads-list-sort";

function buildLeadsListSortStorageKey(clubSlug: string) {
  return `${STORAGE_KEY_PREFIX}.${STORAGE_VERSION}.${clubSlug.trim().toLowerCase()}`;
}

export function readAdminLeadsListSortFromStorage(clubSlug: string): AdminLeadsListSort {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_LEADS_LIST_SORT;
  }

  try {
    const raw = window.localStorage.getItem(buildLeadsListSortStorageKey(clubSlug));

    if (!raw) {
      return DEFAULT_ADMIN_LEADS_LIST_SORT;
    }

    const parsed = JSON.parse(raw) as { key?: string; dir?: string };

    return parseAdminLeadsListSort(parsed.key, parsed.dir);
  } catch {
    return DEFAULT_ADMIN_LEADS_LIST_SORT;
  }
}

export function writeAdminLeadsListSortToStorage(
  clubSlug: string,
  sort: AdminLeadsListSort,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildLeadsListSortStorageKey(clubSlug),
      JSON.stringify(sort),
    );
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
