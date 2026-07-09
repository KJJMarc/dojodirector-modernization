export interface AdultBeltRankingStudent {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  currentRankLabel: string;
}

export interface AdultBeltRankingDegreeGroup {
  beltLevelId: string;
  rankLabel: string;
  degreeSortKey: number;
  beltSortOrder: number;
  students: AdultBeltRankingStudent[];
}

export interface AdultBeltRankingStripeGroup {
  beltLevelId: string;
  rankLabel: string;
  stripeCount: number;
  beltSortOrder: number;
  students: AdultBeltRankingStudent[];
}

export interface AdultBeltRankingGroup {
  beltColor: MajorAdultBeltColor;
  sectionLabel: string;
  totalStudents: number;
  degreeGroups: AdultBeltRankingDegreeGroup[] | null;
  stripeGroups: AdultBeltRankingStripeGroup[] | null;
}

export interface AdultBeltRecentPromotion {
  userId: string;
  studentName: string;
  previousRankLabel: string;
  newRankLabel: string;
  promotionDateLabel: string;
  promotionDateKey: string;
}

export interface AdultBeltRankingsPageData {
  clubName: string;
  beltGroups: AdultBeltRankingGroup[];
  recentPromotions: AdultBeltRecentPromotion[];
  lastUpdatedLabel: string;
}

export const ADULT_BELT_RANKINGS_RECENT_PROMOTION_DAYS = 30;

export const ADULT_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE =
  "We would like to congratulate all students who have recently been promoted. Promotions recognise commitment, consistency, technical development and contribution to the academy. We are proud of your progress and look forward to supporting your continued journey.";

export const MAJOR_ADULT_BELT_COLORS = [
  "black",
  "brown",
  "purple",
  "blue",
  "white",
] as const;

export type MajorAdultBeltColor = (typeof MAJOR_ADULT_BELT_COLORS)[number];

const MAJOR_BELT_SECTION_LABELS: Record<MajorAdultBeltColor, string> = {
  black: "Black Belt",
  brown: "Brown Belt",
  purple: "Purple Belt",
  blue: "Blue Belt",
  white: "White Belt",
};

export function getMajorAdultBeltSectionLabel(color: MajorAdultBeltColor) {
  return MAJOR_BELT_SECTION_LABELS[color];
}

export function getMajorAdultBeltColor(
  beltName: string,
  beltType?: string | null,
): MajorAdultBeltColor | null {
  const normalizedName = beltName.trim().toLowerCase();
  const normalizedType = beltType?.trim().toLowerCase() ?? "";

  if (normalizedName.includes("black") || normalizedType === "degree") {
    return "black";
  }

  if (normalizedName.includes("brown")) {
    return "brown";
  }

  if (normalizedName.includes("purple")) {
    return "purple";
  }

  if (normalizedName.includes("blue")) {
    return "blue";
  }

  if (normalizedName.includes("white")) {
    return "white";
  }

  return null;
}

export function getBeltStripeCount(belt: {
  name: string;
  stripe_count: number | null;
}) {
  if (typeof belt.stripe_count === "number" && belt.stripe_count >= 0) {
    return belt.stripe_count;
  }

  const stripeMatch = belt.name.match(/(\d+)\s*stripe/i);
  return stripeMatch ? Number.parseInt(stripeMatch[1] ?? "0", 10) : 0;
}

export function getBlackBeltDegreeSortKey(
  beltName: string,
  beltType?: string | null,
): number {
  const normalizedName = beltName.trim().toLowerCase();

  const degreeMatch = normalizedName.match(
    /(\d+)(?:st|nd|rd|th)\s*degree|degree\s*(\d+)/i,
  );

  if (degreeMatch) {
    return Number.parseInt(degreeMatch[1] ?? degreeMatch[2] ?? "0", 10);
  }

  if (beltType?.trim().toLowerCase() === "degree") {
    const numberMatch = normalizedName.match(/\d+/);
    return numberMatch ? Number.parseInt(numberMatch[0], 10) : 0;
  }

  return 0;
}

export function compareStudentsBySurnameFirstName(
  left: Pick<AdultBeltRankingStudent, "lastName" | "firstName">,
  right: Pick<AdultBeltRankingStudent, "lastName" | "firstName">,
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

export function sortStudentsBySurnameFirstName<T extends AdultBeltRankingStudent>(
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

export function formatStripeGroupDisplayTitle(
  beltColor: MajorAdultBeltColor,
  stripeCount: number,
  rankLabel: string,
) {
  if (beltColor === "white") {
    return rankLabel;
  }

  if (stripeCount === 0) {
    return "0 Stripes";
  }

  if (stripeCount === 1) {
    return "1 Stripe";
  }

  return `${stripeCount} Stripes`;
}

export function shouldIncludeRankedStudent(
  majorColor: MajorAdultBeltColor,
  stripeCount: number,
) {
  if (majorColor === "white") {
    return stripeCount >= 1;
  }

  return true;
}

/** Plain adult White Belt (0 stripes) — hidden from public congratulations only. */
export function isPlainAdultWhiteBeltLevel(belt: {
  name: string;
  stripe_count: number | null;
}) {
  const normalizedName = belt.name.trim().toLowerCase();

  if (!/\bwhite\b/.test(normalizedName)) {
    return false;
  }

  const withoutWhite = normalizedName.replace(/\bwhite\b/g, "").trim();

  if (/\b(grey|gray|yellow|orange|green|blue|purple|brown|black)\b/.test(withoutWhite)) {
    return false;
  }

  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount > 0) {
    return false;
  }

  return !/\d+\s*stripe/i.test(belt.name);
}

export function shouldIncludeRecentPromotionInPublicCongratulations(
  belt: { name: string; stripe_count: number | null } | null | undefined,
) {
  if (!belt) {
    return true;
  }

  return !isPlainAdultWhiteBeltLevel(belt);
}

export function compareStripeGroups(
  left: Pick<AdultBeltRankingStripeGroup, "stripeCount" | "beltSortOrder" | "rankLabel">,
  right: Pick<AdultBeltRankingStripeGroup, "stripeCount" | "beltSortOrder" | "rankLabel">,
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
