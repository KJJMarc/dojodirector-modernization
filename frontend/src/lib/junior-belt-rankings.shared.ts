import { getBeltStripeCount } from "@/lib/adult-belt-rankings.shared";

export interface JuniorBeltRankingStudent {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  currentRankLabel: string;
}

export interface JuniorBeltRankingStripeGroup {
  beltLevelId: string;
  rankLabel: string;
  stripeCount: number;
  beltSortOrder: number;
  students: JuniorBeltRankingStudent[];
}

export interface JuniorBeltRankingGroup {
  sectionKey: string;
  sectionLabel: string;
  beltName: string;
  beltColour: string | null;
  rankSortKey: number;
  totalStudents: number;
  stripeGroups: JuniorBeltRankingStripeGroup[];
}

export interface JuniorBeltRecentPromotion {
  userId: string;
  studentName: string;
  previousRankLabel: string;
  newRankLabel: string;
  promotionDateLabel: string;
  promotionDateKey: string;
}

export interface JuniorBeltRankingsPageData {
  clubName: string;
  beltGroups: JuniorBeltRankingGroup[];
  recentPromotions: JuniorBeltRecentPromotion[];
  lastUpdatedLabel: string;
}

export const JUNIOR_BELT_RANKINGS_RECENT_PROMOTION_DAYS = 30;

export const JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE =
  "We would like to congratulate all junior students who have recently been promoted. Promotions recognise commitment, consistency, technical development and contribution to the academy. We are proud of your progress and look forward to supporting your continued journey.";

export type JuniorBeltBaseColor = "green" | "orange" | "yellow" | "grey" | "white";

export type JuniorBeltCenterVariant = "black" | "plain" | "white";

export interface JuniorBeltRankParts {
  baseColor: JuniorBeltBaseColor;
  centerVariant: JuniorBeltCenterVariant;
  stripeCount: number;
}

const JUNIOR_BELT_COLOUR_FIELD_MAP: Record<
  string,
  Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">
> = {
  green_black: { baseColor: "green", centerVariant: "black" },
  green_white: { baseColor: "green", centerVariant: "white" },
  green: { baseColor: "green", centerVariant: "plain" },
  orange_black: { baseColor: "orange", centerVariant: "black" },
  orange_white: { baseColor: "orange", centerVariant: "white" },
  orange: { baseColor: "orange", centerVariant: "plain" },
  yellow_black: { baseColor: "yellow", centerVariant: "black" },
  yellow_white: { baseColor: "yellow", centerVariant: "white" },
  yellow: { baseColor: "yellow", centerVariant: "plain" },
  grey_black: { baseColor: "grey", centerVariant: "black" },
  grey_white: { baseColor: "grey", centerVariant: "white" },
  grey: { baseColor: "grey", centerVariant: "plain" },
  gray_black: { baseColor: "grey", centerVariant: "black" },
  gray_white: { baseColor: "grey", centerVariant: "white" },
  gray: { baseColor: "grey", centerVariant: "plain" },
  white: { baseColor: "white", centerVariant: "plain" },
};

/** Normalised lookup keys for explicit junior belt section resolution (space-separated). */
const JUNIOR_BELT_SECTION_LOOKUP: Record<
  string,
  Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">
> = {
  "green black": { baseColor: "green", centerVariant: "black" },
  "green white": { baseColor: "green", centerVariant: "white" },
  green: { baseColor: "green", centerVariant: "plain" },
  "orange black": { baseColor: "orange", centerVariant: "black" },
  "orange white": { baseColor: "orange", centerVariant: "white" },
  orange: { baseColor: "orange", centerVariant: "plain" },
  "yellow black": { baseColor: "yellow", centerVariant: "black" },
  "yellow white": { baseColor: "yellow", centerVariant: "white" },
  yellow: { baseColor: "yellow", centerVariant: "plain" },
  "grey black": { baseColor: "grey", centerVariant: "black" },
  "gray black": { baseColor: "grey", centerVariant: "black" },
  "grey white": { baseColor: "grey", centerVariant: "white" },
  "gray white": { baseColor: "grey", centerVariant: "white" },
  grey: { baseColor: "grey", centerVariant: "plain" },
  gray: { baseColor: "grey", centerVariant: "plain" },
  white: { baseColor: "white", centerVariant: "plain" },
};

function stripJuniorBeltStripeSuffix(beltName: string) {
  return beltName
    .trim()
    .replace(/\s+\d+\s+stripes?\b/gi, "")
    .replace(/\s+\d+\s+stripe\b/gi, "")
    .trim();
}

export function normalizeJuniorBeltNameForLookup(beltName: string) {
  return stripJuniorBeltStripeSuffix(beltName)
    .trim()
    .toLowerCase()
    .replace(/^junior\s+/, "")
    .replace(/\s*&\s*/g, " ")
    .replace(/\band\s+/g, " ")
    .replace(/\bbelt\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveJuniorBeltSectionParts(
  beltName: string,
  beltColour?: string | null,
): Pick<JuniorBeltRankParts, "baseColor" | "centerVariant"> {
  const fromColour = parseJuniorBeltRankPartsFromColour(beltColour);

  if (fromColour) {
    return fromColour;
  }

  const lookupKey = normalizeJuniorBeltNameForLookup(beltName);
  const fromLookup = JUNIOR_BELT_SECTION_LOOKUP[lookupKey];

  if (fromLookup) {
    return fromLookup;
  }

  return { baseColor: "white", centerVariant: "plain" };
}

export function resolveJuniorBeltSectionKey(
  beltName: string,
  beltColour?: string | null,
) {
  return getJuniorBeltSectionKey(resolveJuniorBeltSectionParts(beltName, beltColour));
}

export function parseJuniorBeltRankPartsFromColour(
  beltColour: string | null | undefined,
): Pick<JuniorBeltRankParts, "baseColor" | "centerVariant"> | null {
  if (!beltColour?.trim()) {
    return null;
  }

  return JUNIOR_BELT_COLOUR_FIELD_MAP[beltColour.trim().toLowerCase()] ?? null;
}

export function parseJuniorBeltRankPartsFromName(
  beltName: string,
): Pick<JuniorBeltRankParts, "baseColor" | "centerVariant"> {
  return resolveJuniorBeltSectionParts(beltName, null);
}

const JUNIOR_BELT_BASE_COLOR_RANK: Record<JuniorBeltBaseColor, number> = {
  green: 5,
  orange: 4,
  yellow: 3,
  grey: 2,
  white: 1,
};

const JUNIOR_BELT_VARIANT_RANK: Record<JuniorBeltCenterVariant, number> = {
  black: 3,
  plain: 2,
  white: 1,
};

const JUNIOR_BELT_COLOR_LABELS: Record<JuniorBeltBaseColor, string> = {
  green: "Green",
  orange: "Orange",
  yellow: "Yellow",
  grey: "Grey",
  white: "White",
};

export const JUNIOR_BELT_SECTIONS: Array<{
  baseColor: JuniorBeltBaseColor;
  centerVariant: JuniorBeltCenterVariant;
}> = [
  { baseColor: "green", centerVariant: "black" },
  { baseColor: "green", centerVariant: "plain" },
  { baseColor: "green", centerVariant: "white" },
  { baseColor: "orange", centerVariant: "black" },
  { baseColor: "orange", centerVariant: "plain" },
  { baseColor: "orange", centerVariant: "white" },
  { baseColor: "yellow", centerVariant: "black" },
  { baseColor: "yellow", centerVariant: "plain" },
  { baseColor: "yellow", centerVariant: "white" },
  { baseColor: "grey", centerVariant: "black" },
  { baseColor: "grey", centerVariant: "plain" },
  { baseColor: "grey", centerVariant: "white" },
  { baseColor: "white", centerVariant: "plain" },
];

export function parseJuniorBeltRankParts(
  beltName: string,
  stripeCount: number | null = null,
  beltColour: string | null = null,
): JuniorBeltRankParts {
  return {
    ...resolveJuniorBeltSectionParts(beltName, beltColour),
    stripeCount: getBeltStripeCount({
      name: beltName,
      stripe_count: stripeCount,
    }),
  };
}

export function getJuniorBeltRankSortKey(parts: JuniorBeltRankParts) {
  return (
    JUNIOR_BELT_BASE_COLOR_RANK[parts.baseColor] * 100 +
    JUNIOR_BELT_VARIANT_RANK[parts.centerVariant] * 10 +
    parts.stripeCount
  );
}

export function getJuniorBeltSectionKey(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {
  if (parts.centerVariant === "plain") {
    return parts.baseColor;
  }

  return `${parts.baseColor}-${parts.centerVariant}`;
}

export function getJuniorBeltSectionSortKey(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {
  return getJuniorBeltRankSortKey({
    ...parts,
    stripeCount: 0,
  });
}

export function getJuniorBeltSectionLabel(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {
  const colorLabel = JUNIOR_BELT_COLOR_LABELS[parts.baseColor];

  if (parts.centerVariant === "black") {
    return `${colorLabel} & Black Belt`;
  }

  if (parts.centerVariant === "white") {
    return `${colorLabel} & White Belt`;
  }

  return `${colorLabel} Belt`;
}

export function getJuniorBeltRepresentativeName(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {
  const colorLabel = JUNIOR_BELT_COLOR_LABELS[parts.baseColor];

  if (parts.centerVariant === "black") {
    return `${colorLabel} Belt & Black`;
  }

  if (parts.centerVariant === "white") {
    return `${colorLabel} Belt & White`;
  }

  return `${colorLabel} Belt`;
}

export function getJuniorBeltRepresentativeColour(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {
  if (parts.centerVariant === "plain") {
    return parts.baseColor;
  }

  return `${parts.baseColor}_${parts.centerVariant}`;
}

export function compareJuniorBeltRankingGroups(
  left: Pick<JuniorBeltRankingGroup, "rankSortKey" | "sectionLabel">,
  right: Pick<JuniorBeltRankingGroup, "rankSortKey" | "sectionLabel">,
) {
  if (left.rankSortKey !== right.rankSortKey) {
    return right.rankSortKey - left.rankSortKey;
  }

  return left.sectionLabel.localeCompare(right.sectionLabel, "en", {
    sensitivity: "base",
  });
}

export function compareJuniorBeltStripeGroups(
  left: Pick<JuniorBeltRankingStripeGroup, "stripeCount" | "beltSortOrder" | "rankLabel">,
  right: Pick<JuniorBeltRankingStripeGroup, "stripeCount" | "beltSortOrder" | "rankLabel">,
) {
  if (left.stripeCount !== right.stripeCount) {
    return right.stripeCount - left.stripeCount;
  }

  if (left.beltSortOrder !== right.beltSortOrder) {
    return right.beltSortOrder - left.beltSortOrder;
  }

  return left.rankLabel.localeCompare(right.rankLabel, "en", {
    sensitivity: "base",
  });
}

export function formatJuniorStripeGroupDisplayTitle(stripeCount: number) {
  if (stripeCount === 0) {
    return "0 Stripes";
  }

  if (stripeCount === 1) {
    return "1 Stripe";
  }

  return `${stripeCount} Stripes`;
}

/** Public junior rankings hide plain white (0 stripes) — display starts at 1 stripe. */
export function shouldIncludeJuniorRankedStudent(
  sectionKey: string,
  stripeCount: number,
) {
  if (sectionKey === "white") {
    return stripeCount >= 1;
  }

  return true;
}

/** Plain junior White (0 stripes) — hidden from public congratulations only. */
export function isPlainJuniorWhiteBeltLevel(belt: {
  name: string;
  stripe_count: number | null;
}) {
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

export function shouldIncludeJuniorRecentPromotionInPublicCongratulations(
  belt: { name: string; stripe_count: number | null } | null | undefined,
) {
  if (!belt) {
    return true;
  }

  return !isPlainJuniorWhiteBeltLevel(belt);
}

export function getJuniorBeltSectionTheme(
  parts: Pick<JuniorBeltRankParts, "baseColor" | "centerVariant">,
) {

  const themeByColor: Record<
    JuniorBeltBaseColor,
    { badge: string; ring: string; heading: string }
  > = {
    green: {
      badge: "bg-green-700 text-white",
      ring: "ring-green-700/15",
      heading: "text-green-950",
    },
    orange: {
      badge: "bg-orange-600 text-white",
      ring: "ring-orange-600/15",
      heading: "text-orange-950",
    },
    yellow: {
      badge: "bg-yellow-600 text-white",
      ring: "ring-yellow-500/20",
      heading: "text-yellow-950",
    },
    grey: {
      badge: "bg-neutral-600 text-white",
      ring: "ring-neutral-500/15",
      heading: "text-neutral-900",
    },
    white: {
      badge: "bg-neutral-500 text-white",
      ring: "ring-neutral-300/25",
      heading: "text-neutral-800",
    },
  };

  return themeByColor[parts.baseColor];
}

export function compareStudentsBySurnameFirstName(
  left: Pick<JuniorBeltRankingStudent, "lastName" | "firstName">,
  right: Pick<JuniorBeltRankingStudent, "lastName" | "firstName">,
) {
  const lastNameCompare = (left.lastName ?? "").localeCompare(
    right.lastName ?? "",
    "en",
    { sensitivity: "base" },
  );

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return (left.firstName ?? "").localeCompare(right.firstName ?? "", "en", {
    sensitivity: "base",
  });
}

export function sortStudentsBySurnameFirstName<T extends JuniorBeltRankingStudent>(
  students: T[],
) {
  return [...students].sort(compareStudentsBySurnameFirstName);
}

export function formatPromotionDateLabel(awardedAt: string) {
  const date = new Date(awardedAt);

  if (Number.isNaN(date.getTime())) {
    return awardedAt;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatLastUpdatedLabel(referenceDate = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(referenceDate);
}
