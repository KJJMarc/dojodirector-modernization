export interface JuniorBeltRankingStudent {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  currentRankLabel: string;
}

export interface JuniorBeltRankingGroup {
  beltLevelId: string;
  rankLabel: string;
  beltSortOrder: number;
  students: JuniorBeltRankingStudent[];
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

export function getJuniorBeltAccentClass(beltName: string) {
  const normalized = beltName.trim().toLowerCase();

  if (normalized.includes("green")) {
    return {
      accent: "bg-green-700",
      badge: "bg-green-700 text-white",
      ring: "ring-green-700/15",
      heading: "text-green-950",
    };
  }

  if (normalized.includes("orange")) {
    return {
      accent: "bg-orange-600",
      badge: "bg-orange-600 text-white",
      ring: "ring-orange-600/15",
      heading: "text-orange-950",
    };
  }

  if (normalized.includes("yellow")) {
    return {
      accent: "bg-yellow-500",
      badge: "bg-yellow-600 text-white",
      ring: "ring-yellow-500/20",
      heading: "text-yellow-950",
    };
  }

  if (normalized.includes("grey") || normalized.includes("gray")) {
    return {
      accent: "bg-neutral-500",
      badge: "bg-neutral-600 text-white",
      ring: "ring-neutral-500/15",
      heading: "text-neutral-900",
    };
  }

  return {
    accent: "bg-neutral-300",
    badge: "bg-neutral-500 text-white",
    ring: "ring-neutral-300/25",
    heading: "text-neutral-900",
  };
}
