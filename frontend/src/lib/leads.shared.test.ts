import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  ADMIN_EDIT_LEAD_SOURCE_OPTIONS,
  buildAdminLeadsSummary,
  buildTrialEnquiryProgrammeInterests,
  computeLeadFollowUpStatus,
  formatLeadSourceLabel,
  formatLeadStatusLabel,
  isLeadTrialAttendancePending,
  MANUAL_LEAD_SOURCE_OPTIONS,
  normalizeLeadStatus,
  parseLeadStatus,
  resolveAdminEditableLeadSource,
  resolveTrialLeadAcademySlug,
  resolveTrialLeadAcademySlugForClub,
  TRIAL_ENQUIRY_PROGRAMME_INTERESTS,
  type AdminLeadListRow,
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

test("normalizeLeadStatus maps legacy pipeline values to simplified statuses", () => {
  assert.equal(normalizeLeadStatus("new"), "new_enquiry");
  assert.equal(normalizeLeadStatus("contacted"), "new_enquiry");
  assert.equal(normalizeLeadStatus("closed"), "trial_missed");
  assert.equal(normalizeLeadStatus("no_show"), "trial_missed");
  assert.equal(normalizeLeadStatus("converted"), "joined");
  assert.equal(normalizeLeadStatus("trial_booked"), "trial_booked");
});

test("formatLeadStatusLabel uses simplified status labels", () => {
  assert.equal(formatLeadStatusLabel("new_enquiry"), "New Enquiry");
  assert.equal(formatLeadStatusLabel("trial_missed"), "Trial Missed");
  assert.equal(formatLeadStatusLabel("new"), "New Enquiry");
  assert.equal(formatLeadStatusLabel("unknown_status"), "New Enquiry");
});

test("isLeadTrialAttendancePending warns when trial date passed without attendance", () => {
  const pastSession = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  assert.equal(
    isLeadTrialAttendancePending({
      status: "trial_booked",
      trialAttendedAt: null,
      linkedTrialSessionStartsAt: pastSession,
    }),
    true,
  );
  assert.equal(
    isLeadTrialAttendancePending({
      status: "trial_missed",
      trialAttendedAt: null,
      linkedTrialSessionStartsAt: pastSession,
    }),
    false,
  );
  assert.equal(
    isLeadTrialAttendancePending({
      status: "trial_booked",
      trialAttendedAt: new Date().toISOString(),
      linkedTrialSessionStartsAt: pastSession,
    }),
    false,
  );
});

test("parseLeadStatus accepts canonical and legacy values", () => {
  assert.equal(parseLeadStatus("new_enquiry"), "new_enquiry");
  assert.equal(parseLeadStatus("contacted"), "new_enquiry");
});

test("buildAdminLeadsSummary counts new enquiries and follow-up separately", () => {
  const leads = [
    {
      status: "new_enquiry",
      followUpStatus: "needs_follow_up",
      joinedAt: null,
    },
    {
      status: "trial_booked",
      followUpStatus: "ok",
      joinedAt: null,
    },
  ] as AdminLeadListRow[];

  const summary = buildAdminLeadsSummary(leads);

  assert.equal(summary.newLeads, 1);
  assert.equal(summary.needsFollowUp, 1);
  assert.equal(summary.trialBooked, 1);
});

test("computeLeadFollowUpStatus keeps trial missed leads actionable", () => {
  assert.equal(
    computeLeadFollowUpStatus({
      status: "trial_missed",
      submittedAt: new Date().toISOString(),
      contactedAt: null,
      trialAttendedAt: null,
      linkedTrialSessionStartsAt: null,
    }),
    "needs_follow_up",
  );
});

test("computeLeadFollowUpStatus does not follow up on past trial dates alone", () => {
  const pastSession = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  assert.equal(
    computeLeadFollowUpStatus({
      status: "trial_booked",
      submittedAt: new Date().toISOString(),
      contactedAt: null,
      trialAttendedAt: null,
      linkedTrialSessionStartsAt: pastSession,
    }),
    "ok",
  );
});
