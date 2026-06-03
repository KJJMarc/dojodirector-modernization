/**
 * Regression checks for instructor portal membership sync planning.
 * Mirrors frontend/src/lib/instructor-portal-membership-sync.shared.ts
 * Usage: node scripts/verify-instructor-portal-membership-sync.mjs
 */

const INSTRUCTOR_ROLES = new Set(["instructor", "admin", "super_admin"]);

function hasActiveInstructorPortalMembershipAnywhere(memberships) {
  return memberships.some(
    (membership) =>
      INSTRUCTOR_ROLES.has(membership.role ?? "") && membership.status === "active",
  );
}

function planInstructorPortalMembershipSync({ memberships, profile }) {
  const hasInstructorMembership = hasActiveInstructorPortalMembershipAnywhere(
    memberships,
  );

  if (hasInstructorMembership && profile.auth_user_id) {
    const loginEmail =
      profile.instructor_portal_login_email?.trim() ||
      profile.portal_login_email?.trim() ||
      profile.email?.trim() ||
      null;

    const needsLoginEmail = !profile.instructor_portal_login_email?.trim();

    if (needsLoginEmail && loginEmail) {
      return {
        type: "activate",
        instructorPortalLoginEmail: loginEmail.toLowerCase(),
      };
    }

    return { type: "activate" };
  }

  if (
    !hasInstructorMembership &&
    (profile.instructor_portal_auth_status === "active" ||
      profile.instructor_portal_auth_status === "invited")
  ) {
    return { type: "deactivate" };
  }

  return { type: "none" };
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const studentWithAuth = {
  auth_user_id: "auth-1",
  instructor_portal_login_email: null,
  portal_login_email: "student@example.com",
  email: "student@example.com",
  instructor_portal_auth_status: "not_invited",
};

assert(
  planInstructorPortalMembershipSync({
    memberships: [{ role: "instructor", status: "active" }],
    profile: studentWithAuth,
  }).type === "activate",
  "Upgrading to instructor with auth activates portal access",
);

const activated = planInstructorPortalMembershipSync({
  memberships: [{ role: "instructor", status: "active" }],
  profile: studentWithAuth,
});

assert(
  activated.type === "activate" &&
    activated.instructorPortalLoginEmail === "student@example.com",
  "Activation copies portal login email when instructor login email is missing",
);

assert(
  planInstructorPortalMembershipSync({
    memberships: [
      { role: "student", status: "active" },
      { role: "instructor", status: "active" },
    ],
    profile: {
      ...studentWithAuth,
      instructor_portal_auth_status: "active",
    },
  }).type !== "deactivate",
  "Downgrading one academy while instructor elsewhere does not revoke portal access",
);

assert(
  planInstructorPortalMembershipSync({
    memberships: [{ role: "student", status: "active" }],
    profile: {
      ...studentWithAuth,
      instructor_portal_auth_status: "active",
    },
  }).type === "deactivate",
  "Downgraded everywhere deactivates instructor portal access",
);

assert(
  planInstructorPortalMembershipSync({
    memberships: [{ role: "instructor", status: "active" }],
    profile: { ...studentWithAuth, auth_user_id: null },
  }).type === "none",
  "Instructor role without auth does not auto-create login",
);

console.log("\nAll instructor portal membership sync checks passed.");
