import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStudentPortalAgreementCheckboxLabels } from "@/lib/student-portal-agreements.shared";
import { resolveStudentPortalAgreementClubFromAccessibleClubs } from "@/lib/student-portal-club.shared";

const BAHAMAS_CLUB = {
  id: "276cb805-7095-4e78-984b-bb41fb2cb664",
  slug: "bahamas-jiu-jitsu",
  name: "Bahamas Jiu Jitsu",
};

const KINGSTON_CLUB = {
  id: "a869a3a1-2174-43a5-87d1-3f365f11c68a",
  slug: "kingston-jiu-jitsu",
  name: "Kingston Jiu Jitsu",
};

const KIDS_CLUB = {
  id: "0e81995e-7ed5-490d-8425-f23c87f34587",
  slug: "kingston-jiu-jitsu-kids",
  name: "Kingston Jiu Jitsu Kids",
};

test("resolveStudentPortalAgreementClubFromAccessibleClubs returns Bahamas for Bahamas-only student", () => {
  const club = resolveStudentPortalAgreementClubFromAccessibleClubs([BAHAMAS_CLUB]);

  assert.equal(club?.slug, "bahamas-jiu-jitsu");
  assert.equal(club?.name, "Bahamas Jiu Jitsu");
});

test("resolveStudentPortalAgreementClubFromAccessibleClubs returns Kingston for Kingston-only student", () => {
  const club = resolveStudentPortalAgreementClubFromAccessibleClubs([KINGSTON_CLUB]);

  assert.equal(club?.slug, "kingston-jiu-jitsu");
  assert.equal(club?.name, "Kingston Jiu Jitsu");
});

test("resolveStudentPortalAgreementClubFromAccessibleClubs returns Kids for Kids-only student", () => {
  const club = resolveStudentPortalAgreementClubFromAccessibleClubs([KIDS_CLUB]);

  assert.equal(club?.slug, "kingston-jiu-jitsu-kids");
});

test("resolveStudentPortalAgreementClubFromAccessibleClubs uses first sorted club when multiple exist", () => {
  const club = resolveStudentPortalAgreementClubFromAccessibleClubs([
    KINGSTON_CLUB,
    BAHAMAS_CLUB,
  ]);

  assert.equal(club?.slug, "kingston-jiu-jitsu");
});

test("resolveStudentPortalAgreementClubFromAccessibleClubs returns null when no clubs", () => {
  assert.equal(resolveStudentPortalAgreementClubFromAccessibleClubs([]), null);
});

test("buildStudentPortalAgreementCheckboxLabels uses Bahamas branding for Bahamas-only student", () => {
  const labels = buildStudentPortalAgreementCheckboxLabels("Bahamas Jiu Jitsu");

  assert.match(labels.participant, /Bahamas Jiu Jitsu Membership Agreement/);
  assert.match(labels.consentTraining, /Bahamas Jiu Jitsu/);
  assert.match(labels.agreeAgreement, /Bahamas Jiu Jitsu Membership Agreement/);
  assert.doesNotMatch(labels.participant, /Kingston Jiu Jitsu/);
});
