import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAttendanceCardClubFromCandidates } from "@/lib/attendance-card-manual.shared";

const BAHAMAS_CLUB_ID = "276cb805-7095-4e78-984b-bb41fb2cb664";
const KINGSTON_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KIDS_CLUB_ID = "0e81995e-7ed5-490d-8425-f23c87f34587";

const LEGACY_OPTIONS = { legacyPreferredClubId: KINGSTON_CLUB_ID };

test("resolveAttendanceCardClubFromCandidates returns Bahamas for Bahamas-only student", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: BAHAMAS_CLUB_ID,
        clubSlug: "bahamas-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    LEGACY_OPTIONS,
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: BAHAMAS_CLUB_ID,
    clubSlug: "bahamas-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates returns Kingston for Kingston-only student", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: KINGSTON_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    LEGACY_OPTIONS,
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: KINGSTON_CLUB_ID,
    clubSlug: "kingston-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates returns Kids for Kids-only student", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: KIDS_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu-kids",
        showAttendanceCard: true,
      },
    ],
    LEGACY_OPTIONS,
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: KIDS_CLUB_ID,
    clubSlug: "kingston-jiu-jitsu-kids",
  });
});

test("resolveAttendanceCardClubFromCandidates prefers Kingston for dual Kingston/Bahamas membership", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: BAHAMAS_CLUB_ID,
        clubSlug: "bahamas-jiu-jitsu",
        showAttendanceCard: true,
      },
      {
        clubId: KINGSTON_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    LEGACY_OPTIONS,
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: KINGSTON_CLUB_ID,
    clubSlug: "kingston-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates uses explicit Bahamas club for dual membership", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: BAHAMAS_CLUB_ID,
        clubSlug: "bahamas-jiu-jitsu",
        showAttendanceCard: true,
      },
      {
        clubId: KINGSTON_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    {
      ...LEGACY_OPTIONS,
      explicitClubSlug: "bahamas-jiu-jitsu",
    },
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: BAHAMAS_CLUB_ID,
    clubSlug: "bahamas-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates uses explicit Kingston club for dual membership", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: BAHAMAS_CLUB_ID,
        clubSlug: "bahamas-jiu-jitsu",
        showAttendanceCard: true,
      },
      {
        clubId: KINGSTON_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    {
      ...LEGACY_OPTIONS,
      explicitClubSlug: "kingston-jiu-jitsu",
    },
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: KINGSTON_CLUB_ID,
    clubSlug: "kingston-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates skips ineligible clubs when one remains", () => {
  const resolution = resolveAttendanceCardClubFromCandidates(
    [
      {
        clubId: KINGSTON_CLUB_ID,
        clubSlug: "kingston-jiu-jitsu",
        showAttendanceCard: false,
      },
      {
        clubId: BAHAMAS_CLUB_ID,
        clubSlug: "bahamas-jiu-jitsu",
        showAttendanceCard: true,
      },
    ],
    LEGACY_OPTIONS,
  );

  assert.deepEqual(resolution, {
    kind: "club",
    clubId: BAHAMAS_CLUB_ID,
    clubSlug: "bahamas-jiu-jitsu",
  });
});

test("resolveAttendanceCardClubFromCandidates returns legacy fallback when no eligible clubs", () => {
  assert.deepEqual(
    resolveAttendanceCardClubFromCandidates(
      [
        {
          clubId: BAHAMAS_CLUB_ID,
          clubSlug: "bahamas-jiu-jitsu",
          showAttendanceCard: false,
        },
      ],
      LEGACY_OPTIONS,
    ),
    { kind: "legacy_fallback" },
  );
  assert.deepEqual(
    resolveAttendanceCardClubFromCandidates([], LEGACY_OPTIONS),
    { kind: "legacy_fallback" },
  );
});

test("resolveAttendanceCardClubFromCandidates rejects explicit club that is not eligible", () => {
  assert.deepEqual(
    resolveAttendanceCardClubFromCandidates(
      [
        {
          clubId: BAHAMAS_CLUB_ID,
          clubSlug: "bahamas-jiu-jitsu",
          showAttendanceCard: false,
        },
      ],
      {
        ...LEGACY_OPTIONS,
        explicitClubSlug: "bahamas-jiu-jitsu",
      },
    ),
    { kind: "explicit_not_eligible" },
  );
});
