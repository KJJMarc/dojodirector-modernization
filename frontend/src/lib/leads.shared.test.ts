import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  ADMIN_EDIT_LEAD_SOURCE_OPTIONS,
  buildTrialEnquiryProgrammeInterests,
  formatLeadSourceLabel,
  MANUAL_LEAD_SOURCE_OPTIONS,
  resolveAdminEditableLeadSource,
  resolveTrialLeadAcademySlug,
  resolveTrialLeadAcademySlugForClub,
  TRIAL_ENQUIRY_PROGRAMME_INTERESTS,
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

test("buildTrialEnquiryProgrammeInterests shows BJJ and Not sure for Bahamas", () => {
  assert.deepEqual(buildTrialEnquiryProgrammeInterests(["bjj"]), ["bjj", "not_sure"]);
});

test("buildTrialEnquiryProgrammeInterests excludes Muay Thai and S&C for Bahamas", () => {
  const interests = buildTrialEnquiryProgrammeInterests(["bjj"]);

  assert.ok(!interests.includes("muay_thai"));
  assert.ok(!interests.includes("strength_conditioning"));
});

test("buildTrialEnquiryProgrammeInterests keeps Kingston programme options unchanged", () => {
  assert.deepEqual(
    buildTrialEnquiryProgrammeInterests([
      "bjj",
      "muay_thai",
      "strength_conditioning",
    ]),
    [...TRIAL_ENQUIRY_PROGRAMME_INTERESTS],
  );
});

test("buildTrialEnquiryProgrammeInterests keeps KJJ Kids programme options unchanged", () => {
  assert.deepEqual(
    buildTrialEnquiryProgrammeInterests([
      "bjj",
      "muay_thai",
      "strength_conditioning",
    ]),
    [...TRIAL_ENQUIRY_PROGRAMME_INTERESTS],
  );
});

test("buildTrialEnquiryProgrammeInterests ignores inactive custom programme types", () => {
  assert.deepEqual(
    buildTrialEnquiryProgrammeInterests(["bjj", "custom", "muay_thai"]),
    ["bjj", "muay_thai", "not_sure"],
  );
});

test("manual lead source options exclude web attribution categories", () => {
  assert.deepEqual(MANUAL_LEAD_SOURCE_OPTIONS, ["phone", "walk_in", "referral", "other"]);
  assert.ok(!MANUAL_LEAD_SOURCE_OPTIONS.includes("website" as never));
  assert.ok(!MANUAL_LEAD_SOURCE_OPTIONS.includes("google_ads" as never));
});

test("edit lead source options use clean attribution categories only", () => {
  assert.deepEqual(ADMIN_EDIT_LEAD_SOURCE_OPTIONS, [
    "google_ads",
    "facebook_ads",
    "google_search",
    "website_direct",
    "referral",
    "phone",
    "walk_in",
    "other",
  ]);
  assert.ok(!ADMIN_EDIT_LEAD_SOURCE_OPTIONS.includes("website" as never));
  assert.ok(!ADMIN_EDIT_LEAD_SOURCE_OPTIONS.includes("google" as never));
  assert.ok(!ADMIN_EDIT_LEAD_SOURCE_OPTIONS.includes("facebook" as never));
});

test("resolveAdminEditableLeadSource maps legacy stored values for edit dropdown", () => {
  assert.equal(resolveAdminEditableLeadSource("website"), "website_direct");
  assert.equal(resolveAdminEditableLeadSource("google"), "google_search");
  assert.equal(resolveAdminEditableLeadSource("facebook"), "facebook_ads");
  assert.equal(resolveAdminEditableLeadSource("google_ads"), "google_ads");
});

test("formatLeadSourceLabel still displays legacy stored values correctly", () => {
  assert.equal(formatLeadSourceLabel("website"), "Direct / Unknown");
  assert.equal(formatLeadSourceLabel("google"), "Organic Search");
  assert.equal(formatLeadSourceLabel("facebook"), "Meta Ads");
  assert.equal(formatLeadSourceLabel("google_ads"), "Google Ads");
});
