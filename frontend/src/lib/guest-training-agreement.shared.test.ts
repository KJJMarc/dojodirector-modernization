import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGuestBookingAgreementCheckboxLabels } from "@/lib/guest-training-agreement.shared";

const KINGSTON_CLUB_NAME = "Kingston Jiu Jitsu";
const BAHAMAS_CLUB_NAME = "Bahamas Jiu Jitsu";
const KIDS_CLUB_NAME = "Kingston Jiu Jitsu Kids";

test("buildGuestBookingAgreementCheckboxLabels uses Kingston Jiu Jitsu branding", () => {
  const labels = buildGuestBookingAgreementCheckboxLabels(KINGSTON_CLUB_NAME);

  assert.match(labels.participant, /Kingston Jiu Jitsu Training Agreement/);
  assert.match(labels.consentTraining, /provided by Kingston Jiu Jitsu/);
  assert.match(labels.agreeAgreement, /Kingston Jiu Jitsu Training Agreement/);
  assert.doesNotMatch(labels.participant, /Bahamas Jiu Jitsu/);
});

test("buildGuestBookingAgreementCheckboxLabels uses Bahamas Jiu Jitsu branding", () => {
  const labels = buildGuestBookingAgreementCheckboxLabels(BAHAMAS_CLUB_NAME);

  assert.match(labels.participant, /Bahamas Jiu Jitsu Training Agreement/);
  assert.match(labels.consentTraining, /provided by Bahamas Jiu Jitsu/);
  assert.match(labels.agreeAgreement, /Bahamas Jiu Jitsu Training Agreement/);
  assert.doesNotMatch(labels.participant, /Kingston Jiu Jitsu/);
});

test("buildGuestBookingAgreementCheckboxLabels uses Kingston Jiu Jitsu Kids branding", () => {
  const labels = buildGuestBookingAgreementCheckboxLabels(KIDS_CLUB_NAME);

  assert.match(labels.participant, /Kingston Jiu Jitsu Kids Training Agreement/);
  assert.match(labels.consentTraining, /provided by Kingston Jiu Jitsu Kids/);
  assert.match(labels.agreeAgreement, /Kingston Jiu Jitsu Kids Training Agreement/);
});

test("buildGuestBookingAgreementCheckboxLabels keeps guardian confirm club-neutral", () => {
  const labels = buildGuestBookingAgreementCheckboxLabels(BAHAMAS_CLUB_NAME);

  assert.match(
    labels.guardianConfirm,
    /parent or legal guardian of the participant named above/,
  );
  assert.doesNotMatch(labels.guardianConfirm, /Bahamas Jiu Jitsu/);
});
