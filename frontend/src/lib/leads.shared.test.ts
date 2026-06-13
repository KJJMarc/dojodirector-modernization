import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  resolveTrialLeadAcademySlug,
  resolveTrialLeadAcademySlugForClub,
} from "@/lib/leads.shared";

test("resolveTrialLeadAcademySlug routes Kingston adult enquiries to Kingston", () => {
  assert.equal(resolveTrialLeadAcademySlug("adult"), KINGSTON_CLUB_SLUG);
});

test("resolveTrialLeadAcademySlug routes Kingston child/teen enquiries to KJJ Kids", () => {
  assert.equal(
    resolveTrialLeadAcademySlug("child_teen"),
    KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  );
});

test("resolveTrialLeadAcademySlugForClub routes Kingston adult enquiries to Kingston", () => {
  assert.equal(
    resolveTrialLeadAcademySlugForClub(KINGSTON_CLUB_SLUG, "adult"),
    KINGSTON_CLUB_SLUG,
  );
});

test("resolveTrialLeadAcademySlugForClub routes Kingston child/teen enquiries to KJJ Kids", () => {
  assert.equal(
    resolveTrialLeadAcademySlugForClub(KINGSTON_CLUB_SLUG, "child_teen"),
    KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  );
});

test("resolveTrialLeadAcademySlugForClub routes Bahamas adult enquiries to Bahamas", () => {
  assert.equal(
    resolveTrialLeadAcademySlugForClub(BAHAMAS_JIU_JITSU_CLUB_SLUG, "adult"),
    BAHAMAS_JIU_JITSU_CLUB_SLUG,
  );
});

test("resolveTrialLeadAcademySlugForClub routes Bahamas child/teen enquiries to Bahamas", () => {
  assert.equal(
    resolveTrialLeadAcademySlugForClub(BAHAMAS_JIU_JITSU_CLUB_SLUG, "child_teen"),
    BAHAMAS_JIU_JITSU_CLUB_SLUG,
  );
});

test("resolveTrialLeadAcademySlugForClub does not route Bahamas enquiries to Kingston or KJJ Kids", () => {
  for (const audience of ["adult", "child_teen"] as const) {
    const targetSlug = resolveTrialLeadAcademySlugForClub(
      BAHAMAS_JIU_JITSU_CLUB_SLUG,
      audience,
    );

    assert.notEqual(targetSlug, KINGSTON_CLUB_SLUG);
    assert.notEqual(targetSlug, KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG);
    assert.equal(targetSlug, BAHAMAS_JIU_JITSU_CLUB_SLUG);
  }
});
