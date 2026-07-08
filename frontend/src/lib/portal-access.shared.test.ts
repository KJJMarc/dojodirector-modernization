import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUninvitedPortalSetupEligible,
  isWithoutAccessPortalSetupEligible,
  type PortalAccessBulkEligibilityInput,
} from "./portal-access.shared.ts";
import {
  buildPortalSetupAdminStatus,
  describePortalSetupSendBlocker,
} from "./portal-setup.shared.ts";

function buildEligibilityInput(
  overrides: Partial<PortalAccessBulkEligibilityInput> = {},
): PortalAccessBulkEligibilityInput {
  return {
    profileEmail: "student@example.com",
    membershipStatus: "active",
    portalAuthStatus: "not_invited",
    portalInvitedAt: null,
    instructorPortalAuthStatus: "not_invited",
    instructorPortalInvitedAt: null,
    membershipRole: "student",
    hasInstructorPortalMembershipAnywhere: false,
    ...overrides,
  };
}

describe("portal access bulk eligibility", () => {
  it("treats active students with not_invited portal status as uninvited", () => {
    const input = buildEligibilityInput();

    assert.equal(isUninvitedPortalSetupEligible(input), true);
    assert.equal(isWithoutAccessPortalSetupEligible(input), true);
  });

  it("does not treat invited students as uninvited", () => {
    const input = buildEligibilityInput({
      portalAuthStatus: "invited",
      portalInvitedAt: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(isUninvitedPortalSetupEligible(input), false);
    assert.equal(isWithoutAccessPortalSetupEligible(input), true);
  });

  it("does not include students who already have active portal access", () => {
    const input = buildEligibilityInput({
      portalAuthStatus: "active",
    });

    assert.equal(isUninvitedPortalSetupEligible(input), false);
    assert.equal(isWithoutAccessPortalSetupEligible(input), false);
  });

  it("does not mark student setup as sent when instructor portal is not required", () => {
    const status = buildPortalSetupAdminStatus({
      profileEmail: "brendon.salzer@gmail.com",
      portalAuthStatus: "not_invited",
      portalInvitedAt: null,
      instructorPortalAuthStatus: "not_invited",
      instructorPortalInvitedAt: null,
      membershipRole: "student",
      hasSuperAdminMembership: false,
      hasInstructorPortalMembershipAnywhere: false,
    });

    assert.equal(status.statusLabel, "Portal setup not sent");
    assert.equal(status.canSendSetupEmail, true);
  });
});

describe("describePortalSetupSendBlocker", () => {
  it("explains when membership is inactive", () => {
    assert.equal(
      describePortalSetupSendBlocker({
        profileEmail: "eliannacorncob@gmail.com",
        membershipStatus: "inactive",
      }),
      "Activate this member's membership before sending a portal setup email.",
    );
  });

  it("explains when profile email is missing", () => {
    assert.equal(
      describePortalSetupSendBlocker({
        profileEmail: null,
        membershipStatus: "active",
      }),
      "Add a profile email before sending a portal setup email.",
    );
  });

  it("returns null when the member can receive setup email", () => {
    assert.equal(
      describePortalSetupSendBlocker({
        profileEmail: "student@example.com",
        membershipStatus: "active",
      }),
      null,
    );
  });
});
