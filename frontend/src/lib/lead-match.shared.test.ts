import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRepeatEnquiryNote,
  mergeLeadExperienceLevel,
  mergeLeadPhone,
  mergeLeadProgrammeInterest,
  mergeLeadSource,
  mergeLeadStatusOnRepeatEnquiry,
  pickCanonicalLeadMatch,
} from "./lead-match.shared.ts";

describe("pickCanonicalLeadMatch", () => {
  it("returns the oldest lead when duplicates exist", () => {
    const oldest = { id: "old", created_at: "2026-06-14T21:58:57.608Z" };
    const newest = { id: "new", created_at: "2026-07-06T20:04:56.404Z" };

    assert.equal(pickCanonicalLeadMatch([newest, oldest])?.id, "old");
  });
});

describe("mergeLeadProgrammeInterest", () => {
  it("replaces not_sure with a specific programme", () => {
    assert.equal(mergeLeadProgrammeInterest("not_sure", "muay_thai"), "muay_thai");
    assert.equal(mergeLeadProgrammeInterest("bjj", "muay_thai"), "bjj");
  });
});

describe("mergeLeadExperienceLevel", () => {
  it("replaces not_sure with a specific level", () => {
    assert.equal(
      mergeLeadExperienceLevel("not_sure", "complete_beginner"),
      "complete_beginner",
    );
    assert.equal(
      mergeLeadExperienceLevel("some_experience", "complete_beginner"),
      "some_experience",
    );
  });
});

describe("mergeLeadSource", () => {
  it("keeps specific attribution over generic website", () => {
    assert.equal(mergeLeadSource("facebook_ads", "referral"), "facebook_ads");
    assert.equal(mergeLeadSource("website", "referral"), "referral");
  });
});

describe("mergeLeadStatusOnRepeatEnquiry", () => {
  it("does not downgrade an advanced pipeline status", () => {
    assert.equal(
      mergeLeadStatusOnRepeatEnquiry("trial_booked", "new_enquiry"),
      "trial_booked",
    );
    assert.equal(
      mergeLeadStatusOnRepeatEnquiry("trial_attended", "new_enquiry"),
      "trial_attended",
    );
  });

  it("advances status when the incoming status is further along", () => {
    assert.equal(
      mergeLeadStatusOnRepeatEnquiry("new_enquiry", "trial_booked"),
      "trial_booked",
    );
  });
});

describe("mergeLeadPhone", () => {
  it("fills a missing phone number only", () => {
    assert.equal(mergeLeadPhone(null, "+447519100903"), "+447519100903");
    assert.equal(mergeLeadPhone("+447519100903", "+440000000000"), "+447519100903");
  });
});

describe("buildRepeatEnquiryNote", () => {
  it("formats repeat enquiry notes with a timestamp", () => {
    const note = buildRepeatEnquiryNote(
      "Do I need gloves?",
      "2026-07-06T20:04:56.404Z",
    );

    assert.match(note ?? "", /Repeat enquiry: Do I need gloves\?/);
  });
});
