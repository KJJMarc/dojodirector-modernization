import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getAcademyPublicPagesForClub } from "@/lib/admin-academy-pages.shared";
import {
  isAdultBeltRankingsPublicPageSlug,
  JUNIOR_BELT_RANKINGS_SOURCE_CLUB_IDS,
  resolveJuniorBeltRankingsSourceClubIds,
} from "@/lib/belt-rankings-clubs.shared";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

const BAHAMAS_CLUB_ID = "276cb805-7095-4e78-984b-bb41fb2cb664";

test("isAdultBeltRankingsPublicPageSlug keeps Kingston on legacy /adult-belt-rankings route", () => {
  assert.equal(isAdultBeltRankingsPublicPageSlug(BAHAMAS_JIU_JITSU_CLUB_SLUG), true);
  assert.equal(isAdultBeltRankingsPublicPageSlug(KINGSTON_CLUB_SLUG), false);
});

test("resolveJuniorBeltRankingsSourceClubIds scopes Bahamas junior rankings to Bahamas only", () => {
  const sourceClubIds = resolveJuniorBeltRankingsSourceClubIds(
    BAHAMAS_JIU_JITSU_CLUB_SLUG,
    BAHAMAS_CLUB_ID,
  );

  assert.deepEqual(sourceClubIds, [BAHAMAS_CLUB_ID]);
  assert.ok(!sourceClubIds.includes(ACTIVE_CLUB_ID));
  assert.ok(!sourceClubIds.includes(KINGSTON_JIU_JITSU_KIDS_CLUB_ID));
});

test("resolveJuniorBeltRankingsSourceClubIds keeps KJJ Kids junior rankings on KJJ + Kids clubs", () => {
  const sourceClubIds = resolveJuniorBeltRankingsSourceClubIds(
    KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
    KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
  );

  assert.deepEqual(sourceClubIds, JUNIOR_BELT_RANKINGS_SOURCE_CLUB_IDS);
  assert.deepEqual(sourceClubIds, [ACTIVE_CLUB_ID, KINGSTON_JIU_JITSU_KIDS_CLUB_ID]);
  assert.ok(!sourceClubIds.includes(BAHAMAS_CLUB_ID));
});

test("getAcademyPublicPagesForClub lists Bahamas adult and junior rankings with club-scoped hrefs", () => {
  const pages = getAcademyPublicPagesForClub(BAHAMAS_JIU_JITSU_CLUB_SLUG);
  const pageIds = pages.map((page) => page.id);

  assert.ok(pageIds.includes("adult-belt-rankings"));
  assert.ok(pageIds.includes("junior-belt-rankings"));

  const adultPage = pages.find((page) => page.id === "adult-belt-rankings");
  const juniorPage = pages.find((page) => page.id === "junior-belt-rankings");

  assert.equal(adultPage?.href, "/bahamas-jiu-jitsu/adult-belt-rankings");
  assert.equal(adultPage?.pathLabel, "/bahamas-jiu-jitsu/adult-belt-rankings");
  assert.equal(juniorPage?.href, "/bahamas-jiu-jitsu/junior-belt-rankings");
  assert.equal(juniorPage?.pathLabel, "/bahamas-jiu-jitsu/junior-belt-rankings");
});

test("getAcademyPublicPagesForClub keeps Kingston adult rankings on legacy route", () => {
  const pages = getAcademyPublicPagesForClub(KINGSTON_CLUB_SLUG);
  const pageIds = pages.map((page) => page.id);

  assert.ok(pageIds.includes("adult-belt-rankings"));
  assert.ok(!pageIds.includes("junior-belt-rankings"));

  const adultPage = pages.find((page) => page.id === "adult-belt-rankings");

  assert.equal(adultPage?.href, "/adult-belt-rankings");
  assert.equal(adultPage?.pathLabel, "/adult-belt-rankings");
});

test("getAcademyPublicPagesForClub keeps KJJ Kids junior rankings unchanged", () => {
  const pages = getAcademyPublicPagesForClub(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG);
  const pageIds = pages.map((page) => page.id);

  assert.ok(pageIds.includes("junior-belt-rankings"));
  assert.ok(!pageIds.includes("adult-belt-rankings"));

  const juniorPage = pages.find((page) => page.id === "junior-belt-rankings");

  assert.equal(juniorPage?.href, "/kingston-jiu-jitsu-kids/junior-belt-rankings");
  assert.equal(juniorPage?.pathLabel, "/kingston-jiu-jitsu-kids/junior-belt-rankings");
});
