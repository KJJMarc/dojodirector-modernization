/**
 * Regression checks for portal auth activation after password sign-in.
 * Mirrors frontend/src/lib/portal-auth-activation.shared.ts
 * Usage: node scripts/verify-portal-auth-sign-in-activation.mjs
 */

function planPortalAuthSignInActivation(input) {
  const hasAuthUser = Boolean(input.authUserId?.trim());

  return {
    promoteStudentPortal: hasAuthUser && input.portalAuthStatus === "invited",
    promoteInstructorPortal:
      hasAuthUser && input.instructorPortalAuthStatus === "invited",
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

assert(
  planPortalAuthSignInActivation({
    authUserId: "auth-1",
    portalAuthStatus: "invited",
    instructorPortalAuthStatus: "not_invited",
  }).promoteStudentPortal,
  "Invited student portal promotes on sign-in when auth is linked",
);

assert(
  !planPortalAuthSignInActivation({
    authUserId: "auth-1",
    portalAuthStatus: "active",
    instructorPortalAuthStatus: "invited",
  }).promoteStudentPortal,
  "Active student portal is not re-promoted",
);

assert(
  planPortalAuthSignInActivation({
    authUserId: "auth-1",
    portalAuthStatus: "active",
    instructorPortalAuthStatus: "invited",
  }).promoteInstructorPortal,
  "Invited instructor portal promotes on sign-in when auth is linked",
);

assert(
  !planPortalAuthSignInActivation({
    authUserId: null,
    portalAuthStatus: "invited",
    instructorPortalAuthStatus: "invited",
  }).promoteStudentPortal &&
    !planPortalAuthSignInActivation({
      authUserId: null,
      portalAuthStatus: "invited",
      instructorPortalAuthStatus: "invited",
    }).promoteInstructorPortal,
  "Missing auth user id does not promote invited statuses",
);

const regression = planPortalAuthSignInActivation({
  authUserId: "existing-auth-user-id",
  portalAuthStatus: "invited",
  instructorPortalAuthStatus: "invited",
});

assert(
  regression.promoteStudentPortal && regression.promoteInstructorPortal,
  "Regression: pre-linked auth_user_id with invited statuses promotes both portals on sign-in",
);

console.log("\nAll portal auth sign-in activation checks passed.");
