import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planPortalAuthSignInActivation } from "./portal-auth-activation.shared.ts";

describe("planPortalAuthSignInActivation", () => {
  it("promotes student portal when auth is linked and status is invited", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: "auth-1",
      portalAuthStatus: "invited",
      instructorPortalAuthStatus: "not_invited",
    });

    assert.equal(plan.promoteStudentPortal, true);
    assert.equal(plan.promoteInstructorPortal, false);
  });

  it("promotes instructor portal when auth is linked and instructor status is invited", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: "auth-1",
      portalAuthStatus: "active",
      instructorPortalAuthStatus: "invited",
    });

    assert.equal(plan.promoteStudentPortal, false);
    assert.equal(plan.promoteInstructorPortal, true);
  });

  it("does not promote when auth_user_id is missing even if invited", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: null,
      portalAuthStatus: "invited",
      instructorPortalAuthStatus: "invited",
    });

    assert.equal(plan.promoteStudentPortal, false);
    assert.equal(plan.promoteInstructorPortal, false);
  });

  it("does not promote when portal statuses are already active", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: "auth-1",
      portalAuthStatus: "active",
      instructorPortalAuthStatus: "active",
    });

    assert.equal(plan.promoteStudentPortal, false);
    assert.equal(plan.promoteInstructorPortal, false);
  });

  it("promotes both flags when both are invited with existing auth link", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: "auth-1",
      portalAuthStatus: "invited",
      instructorPortalAuthStatus: "invited",
    });

    assert.equal(plan.promoteStudentPortal, true);
    assert.equal(plan.promoteInstructorPortal, true);
  });

  it("regression: promotes student portal when auth_user_id was pre-linked at invite time", () => {
    const plan = planPortalAuthSignInActivation({
      authUserId: "existing-auth-user-id",
      portalAuthStatus: "invited",
      instructorPortalAuthStatus: "invited",
    });

    assert.equal(plan.promoteStudentPortal, true);
    assert.equal(plan.promoteInstructorPortal, true);
  });
});
