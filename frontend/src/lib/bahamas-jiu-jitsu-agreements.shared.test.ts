import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BAHAMAS_GUEST_TRAINING_AGREEMENT_SECTIONS,
  BAHAMAS_JIU_JITSU_CLUB_NAME,
  BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS,
} from "@/lib/bahamas-jiu-jitsu-agreements.shared";
import { serializeAgreementSectionsToBody } from "@/lib/club-agreement-templates.shared";

describe("bahamas jiu jitsu agreements", () => {
  it("uses Bahamas branding and Bahamian law wording", () => {
    const body = serializeAgreementSectionsToBody(
      BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS,
    );

    assert.match(body, new RegExp(BAHAMAS_JIU_JITSU_CLUB_NAME));
    assert.match(body, /Commonwealth of The Bahamas/);
    assert.doesNotMatch(body, /Kingston Jiu Jitsu/);
    assert.doesNotMatch(body, /UK (data protection|law)/i);
  });

  it("maps membership wording to training agreement for guests", () => {
    const guestBody = serializeAgreementSectionsToBody(
      BAHAMAS_GUEST_TRAINING_AGREEMENT_SECTIONS,
    );

    assert.match(guestBody, /TRAINING AGREEMENT/);
    assert.match(guestBody, /this Training Agreement/);
    assert.doesNotMatch(guestBody, /MEMBERSHIP AGREEMENT/);
  });
});
