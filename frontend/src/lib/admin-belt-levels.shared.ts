export interface BeltLevelOption {
  id: string;
  label: string;
  sortOrder: number;
}

export type BeltCategory = "adult" | "junior";

const ADULT_BELT_COLOR_ORDER = [
  "white",
  "blue",
  "purple",
  "brown",
  "black",
] as const;

export function formatBeltOptionLabel(belt: {
  name: string;
  stripe_count: number | null;
}) {
  const name = belt.name.trim();
  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount <= 0 || /stripe/i.test(name)) {
    return name;
  }

  return `${name}, ${stripeCount} Stripe${stripeCount === 1 ? "" : "s"}`;
}

export function isJuniorBeltLevel(belt: {
  name: string;
  type?: string | null;
}) {
  const normalizedType = belt.type?.trim().toLowerCase();

  if (normalizedType === "junior" || normalizedType === "kids") {
    return true;
  }

  const normalizedName = belt.name.trim().toLowerCase();
  return /junior|kids|child/.test(normalizedName);
}

function getAdultBeltFallbackSortKey(belt: {
  name: string;
  stripe_count: number | null;
  sort_order: number;
}) {
  const normalizedName = belt.name.trim().toLowerCase();

  for (let index = 0; index < ADULT_BELT_COLOR_ORDER.length; index += 1) {
    const color = ADULT_BELT_COLOR_ORDER[index];

    if (normalizedName.includes(color)) {
      return index * 100 + (belt.stripe_count ?? 0);
    }
  }

  return 10_000 + belt.sort_order;
}

function isSortOrderReliable(
  belts: Array<{ sort_order: number }>,
) {
  if (belts.length <= 1) {
    return true;
  }

  const sortOrders = belts.map((belt) => belt.sort_order);
  const uniqueCount = new Set(sortOrders).size;

  if (uniqueCount !== sortOrders.length) {
    return false;
  }

  for (let index = 1; index < sortOrders.length; index += 1) {
    if (sortOrders[index] <= sortOrders[index - 1]) {
      return false;
    }
  }

  return true;
}

export function sortAdultBeltLevels<
  T extends {
    id: string;
    name: string;
    stripe_count: number | null;
    sort_order: number;
  },
>(belts: T[]): T[] {
  if (belts.length === 0) {
    return [];
  }

  const sorted = [...belts];

  if (isSortOrderReliable(sorted)) {
    sorted.sort((left, right) => left.sort_order - right.sort_order);
    return sorted;
  }

  sorted.sort((left, right) => {
    const leftKey = getAdultBeltFallbackSortKey(left);
    const rightKey = getAdultBeltFallbackSortKey(right);

    if (leftKey !== rightKey) {
      return leftKey - rightKey;
    }

    return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
  });

  return sorted;
}

export function toBeltLevelOptions<
  T extends {
    id: string;
    name: string;
    stripe_count: number | null;
    sort_order: number;
  },
>(belts: T[]): BeltLevelOption[] {
  return belts.map((belt) => ({
    id: belt.id,
    label: formatBeltOptionLabel(belt),
    sortOrder: belt.sort_order,
  }));
}

export function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
