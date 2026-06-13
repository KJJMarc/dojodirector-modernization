import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  buildStudentPortalQuickActions,
  getStudentPortalUiConfig,
} from "@/lib/student-portal-routing.shared";
import { studentOfTheYearPublicPath } from "@/lib/student-of-the-year.shared";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function quickActionLabels(clubSlug: string, clubName: string) {
  const uiConfig = getStudentPortalUiConfig(clubSlug, clubName);

  return buildStudentPortalQuickActions({
    clubSlug,
    userId: USER_ID,
    uiConfig,
    showAdultBeltRankings: true,
  }).map((action) => action.label);
}

function quickActionHref(clubSlug: string, clubName: string, label: string) {
  const uiConfig = getStudentPortalUiConfig(clubSlug, clubName);

  return buildStudentPortalQuickActions({
    clubSlug,
    userId: USER_ID,
    uiConfig,
    showAdultBeltRankings: true,
  }).find((action) => action.label === label)?.href;
}

test("Bahamas student portal quick actions include Bahamas adult and junior rankings", () => {
  const labels = quickActionLabels(BAHAMAS_JIU_JITSU_CLUB_SLUG, "Bahamas Jiu Jitsu");

  assert.ok(labels.includes("Adult Belt Rankings"));
  assert.ok(labels.includes("Junior Belt Rankings"));
  assert.equal(
    quickActionHref(BAHAMAS_JIU_JITSU_CLUB_SLUG, "Bahamas Jiu Jitsu", "Adult Belt Rankings"),
    "/bahamas-jiu-jitsu/adult-belt-rankings",
  );
  assert.equal(
    quickActionHref(BAHAMAS_JIU_JITSU_CLUB_SLUG, "Bahamas Jiu Jitsu", "Junior Belt Rankings"),
    "/bahamas-jiu-jitsu/junior-belt-rankings",
  );
});

test("Bahamas student portal quick actions do not include Student of the Year", () => {
  const labels = quickActionLabels(BAHAMAS_JIU_JITSU_CLUB_SLUG, "Bahamas Jiu Jitsu");

  assert.ok(!labels.includes("Student of the Year"));
});

test("Kingston Jiu Jitsu student portal quick actions remain unchanged", () => {
  const labels = quickActionLabels(KINGSTON_CLUB_SLUG, "Kingston Jiu Jitsu");

  assert.ok(labels.includes("Adult Belt Rankings"));
  assert.ok(labels.includes("Student of the Year"));
  assert.ok(!labels.includes("Junior Belt Rankings"));
  assert.ok(!labels.includes("Junior Belt Levels"));
  assert.equal(
    quickActionHref(KINGSTON_CLUB_SLUG, "Kingston Jiu Jitsu", "Adult Belt Rankings"),
    "/adult-belt-rankings",
  );
  assert.equal(
    quickActionHref(KINGSTON_CLUB_SLUG, "Kingston Jiu Jitsu", "Student of the Year"),
    studentOfTheYearPublicPath(),
  );
});

test("KJJ Kids student portal quick actions remain unchanged", () => {
  const labels = quickActionLabels(
    KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
    "Kingston Jiu Jitsu Kids",
  );

  assert.ok(labels.includes("Junior Belt Levels"));
  assert.ok(!labels.includes("Junior Belt Rankings"));
  assert.ok(!labels.includes("Adult Belt Rankings"));
  assert.ok(!labels.includes("Student of the Year"));
  assert.equal(
    quickActionHref(
      KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      "Kingston Jiu Jitsu Kids",
      "Junior Belt Levels",
    ),
    "/kingston-jiu-jitsu-kids/junior-belt-rankings",
  );
});
