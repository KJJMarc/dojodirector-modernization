/** Sources for attendance marked on the BJJ student attendance card (not session register). */
export const BJJ_ATTENDANCE_CARD_MANUAL_SOURCES = [
  "manual_attendance_card",
  "manual",
  "legacy_import",
] as const;

export type BjjAttendanceCardManualSource =
  (typeof BJJ_ATTENDANCE_CARD_MANUAL_SOURCES)[number];

export const BJJ_ATTENDANCE_CARD_MANUAL_SOURCE: BjjAttendanceCardManualSource =
  "manual_attendance_card";

export function isBjjAttendanceCardManualSource(
  source: string | null | undefined,
): boolean {
  if (!source) {
    return false;
  }

  return (BJJ_ATTENDANCE_CARD_MANUAL_SOURCES as readonly string[]).includes(
    source,
  );
}

export function isLegacyImportAttendanceSource(
  source: string | null | undefined,
): boolean {
  return (source ?? "").trim() === "legacy_import";
}

export interface AttendanceCardClubCandidate {
  clubId: string;
  clubSlug: string;
  showAttendanceCard: boolean;
}

export interface AttendanceCardClubResolutionOptions {
  explicitClubSlug?: string | null;
  /** Kingston club id (ACTIVE_CLUB_ID) — used when multiple clubs are eligible. */
  legacyPreferredClubId: string;
}

export type AttendanceCardClubResolution =
  | { kind: "club"; clubId: string; clubSlug: string }
  | { kind: "legacy_fallback" }
  | { kind: "explicit_not_eligible" };

function filterEligibleAttendanceCardClubs(
  candidates: readonly AttendanceCardClubCandidate[],
): AttendanceCardClubCandidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.showAttendanceCard &&
      candidate.clubId.trim().length > 0 &&
      candidate.clubSlug.trim().length > 0,
  );
}

/**
 * Resolve which club an attendance card belongs to.
 * - Explicit club slug wins when eligible.
 * - A single eligible club is used as-is (e.g. Bahamas-only students).
 * - Multiple eligible clubs fall back to legacy Kingston preference, never club_id order.
 */
export function resolveAttendanceCardClubFromCandidates(
  candidates: readonly AttendanceCardClubCandidate[],
  options: AttendanceCardClubResolutionOptions,
): AttendanceCardClubResolution {
  const eligible = filterEligibleAttendanceCardClubs(candidates);
  const explicitClubSlug = options.explicitClubSlug?.trim();

  if (explicitClubSlug) {
    const explicitMatch = eligible.find(
      (candidate) => candidate.clubSlug === explicitClubSlug,
    );

    if (explicitMatch) {
      return {
        kind: "club",
        clubId: explicitMatch.clubId,
        clubSlug: explicitMatch.clubSlug,
      };
    }

    return { kind: "explicit_not_eligible" };
  }

  if (eligible.length === 1) {
    return {
      kind: "club",
      clubId: eligible[0].clubId,
      clubSlug: eligible[0].clubSlug,
    };
  }

  if (eligible.length > 1) {
    const legacyPreferred = eligible.find(
      (candidate) => candidate.clubId === options.legacyPreferredClubId,
    );

    if (legacyPreferred) {
      return {
        kind: "club",
        clubId: legacyPreferred.clubId,
        clubSlug: legacyPreferred.clubSlug,
      };
    }

    return { kind: "legacy_fallback" };
  }

  return { kind: "legacy_fallback" };
}
