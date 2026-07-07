export interface BeltLevelOption {
  id: string;
  label: string;
  sortOrder: number;
}

export type BeltCategory = "adult" | "junior";

export interface BeltLevelOptionGroup {
  category: BeltCategory;
  label: string;
  options: BeltLevelOption[];
}

const ADULT_BELT_COLOR_ORDER = [
  "white",
  "blue",
  "purple",
  "brown",
  "black",
] as const;

export function formatBeltRankLabelWithStripes(
  baseRankName: string,
  stripeCount: number,
) {
  const base = baseRankName.trim();
  const count = stripeCount <= 0 ? 1 : stripeCount;

  if (count === 1) {
    return `${base} – 1 Stripe`;
  }

  return `${base} – ${count} Stripes`;
}

function normalizeAdultWhiteBeltBaseName(beltName: string) {
  const trimmed = beltName.trim();

  if (/^white\s+belt$/i.test(trimmed)) {
    return "White Belt";
  }

  if (/^white\b/i.test(trimmed) && !/stripe/i.test(trimmed)) {
    return "White Belt";
  }

  return trimmed.replace(/\s+\d+\s+stripes?$/i, "").trim() || "White Belt";
}

/** Adult programme white belt (not junior grey/yellow/orange/green variants). */
export function isAdultMajorWhiteBeltLevel(belt: {
  name: string;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (isJuniorBeltLevel(belt)) {
    return false;
  }

  const normalizedName = belt.name.trim().toLowerCase();

  if (!/\bwhite\b/.test(normalizedName)) {
    return false;
  }

  const withoutWhite = normalizedName.replace(/\bwhite\b/g, "").trim();

  return !/\b(grey|gray|yellow|orange|green|blue|purple|brown|black)\b/.test(
    withoutWhite,
  );
}

/** Adult plain white belt row (0 stripes) — treated as White Belt – 1 Stripe in UI. */
export function isAdultPlainWhiteBeltLevel(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (!isAdultMajorWhiteBeltLevel(belt)) {
    return false;
  }

  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount > 0) {
    return false;
  }

  return !/\d+\s*stripe/i.test(belt.name);
}

/** Junior entry white belt row (0 stripes) — treated as Junior White – 1 Stripe in UI. */
export function isJuniorPlainWhiteBeltLevel(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (!isJuniorBeltLevel(belt)) {
    return false;
  }

  const normalizedName = belt.name.trim().toLowerCase();

  if (!/^junior\s+white\b/.test(normalizedName)) {
    return false;
  }

  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount > 0) {
    return false;
  }

  return !/\d+\s*stripe/i.test(belt.name);
}

/** Plain white belt row (adult or junior entry) — never shown as a standalone rank. */
export function isPlainWhiteBeltLevel(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  return (
    isAdultPlainWhiteBeltLevel(belt) || isJuniorPlainWhiteBeltLevel(belt)
  );
}

export function getEffectiveBeltStripeCount(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (isPlainWhiteBeltLevel(belt)) {
    return 1;
  }

  if (typeof belt.stripe_count === "number" && belt.stripe_count >= 0) {
    return belt.stripe_count;
  }

  const stripeMatch = belt.name.match(/(\d+)\s*stripe/i);
  return stripeMatch ? Number.parseInt(stripeMatch[1] ?? "0", 10) : 0;
}

export function formatAdultWhiteBeltDisplayLabel(
  stripeCount: number,
  beltName = "White Belt",
) {
  return formatBeltRankLabelWithStripes(
    normalizeAdultWhiteBeltBaseName(beltName),
    stripeCount,
  );
}

export function shouldOfferBeltLevelInSelector(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  return !isPlainWhiteBeltLevel(belt);
}

function normalizeJuniorWhiteBaseName(beltName: string) {
  const trimmed = beltName.trim();

  if (/^junior\s+white$/i.test(trimmed)) {
    return "Junior White";
  }

  return trimmed.replace(/\s+\d+\s+stripes?$/i, "").trim() || "Junior White";
}

export function getBeltStripeCount(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (isAdultMajorWhiteBeltLevel(belt) || isJuniorPlainWhiteBeltLevel(belt)) {
    return getEffectiveBeltStripeCount(belt);
  }

  if (typeof belt.stripe_count === "number" && belt.stripe_count >= 0) {
    return belt.stripe_count;
  }

  const stripeMatch = belt.name.match(/(\d+)\s*stripe/i);
  return stripeMatch ? Number.parseInt(stripeMatch[1] ?? "0", 10) : 0;
}

export function formatBeltOptionLabel(belt: {
  name: string;
  stripe_count: number | null;
  belt_category?: string | null;
  type?: string | null;
}) {
  if (isAdultMajorWhiteBeltLevel(belt)) {
    return formatAdultWhiteBeltDisplayLabel(
      getEffectiveBeltStripeCount(belt),
      belt.name,
    );
  }

  if (
    isJuniorPlainWhiteBeltLevel(belt) ||
    (isJuniorBeltLevel(belt) && /^junior\s+white\b/i.test(belt.name))
  ) {
    return formatBeltRankLabelWithStripes(
      normalizeJuniorWhiteBaseName(belt.name),
      getEffectiveBeltStripeCount(belt),
    );
  }

  const name = belt.name.trim();
  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount <= 0 || /stripe/i.test(name)) {
    return name;
  }

  return `${name}, ${stripeCount} Stripe${stripeCount === 1 ? "" : "s"}`;
}

export function isJuniorBeltCategory(
  beltCategory: string | null | undefined,
): boolean {
  return beltCategory?.trim().toLowerCase() === "junior";
}

export function isAdultBeltCategory(
  beltCategory: string | null | undefined,
): boolean {
  return beltCategory?.trim().toLowerCase() === "adult";
}

export function sortBeltLevelsBySortOrder<
  T extends { sort_order: number; name: string },
>(belts: T[]): T[] {
  return [...belts].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
  });
}

export function isJuniorBeltLevel(belt: {
  name: string;
  type?: string | null;
  belt_category?: string | null;
}) {
  if (isJuniorBeltCategory(belt.belt_category)) {
    return true;
  }

  if (isAdultBeltCategory(belt.belt_category)) {
    return false;
  }
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
    belt_category?: string | null;
    type?: string | null;
  },
>(belts: T[]): BeltLevelOption[] {
  return belts
    .filter((belt) => shouldOfferBeltLevelInSelector(belt))
    .map((belt) => ({
      id: belt.id,
      label: formatBeltOptionLabel(belt),
      sortOrder: belt.sort_order,
    }));
}

export function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
