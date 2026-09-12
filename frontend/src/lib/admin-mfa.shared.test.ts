import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ADMIN_MFA_SETUP_PATH,
  ADMIN_MFA_VERIFY_PATH,
  adminNeedsMfaChallenge,
  adminNeedsMfaSetup,
  buildAdminMfaGateRedirectPath,
  buildAdminMfaSetupPath,
  buildAdminMfaVerifyPath,
  isSafeAdminMfaNextPath,
  isValidTotpCode,
  normalizeTotpCode,
  resolveAdminMfaGate,
  sanitizeAdminMfaNextPath,
} from "@/lib/admin-mfa.shared";

const here = dirname(fileURLToPath(import.meta.url));

describe("resolveAdminMfaGate (mandatory admin MFA)", () => {
  it("sends admin with no TOTP to setup (cannot access protected admin route)", () => {
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: false, currentLevel: "aal1" }),
      "setup",
    );
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: false, currentLevel: null }),
      "setup",
    );
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: false, currentLevel: "aal2" }),
      "setup",
    );
    assert.equal(adminNeedsMfaSetup({ hasVerifiedTotp: false }), true);
    assert.equal(
      buildAdminMfaGateRedirectPath("setup", "/admin/kingston-jiu-jitsu"),
      `${ADMIN_MFA_SETUP_PATH}?next=${encodeURIComponent("/admin/kingston-jiu-jitsu")}`,
    );
  });

  it("sends admin with verified TOTP at AAL1 to verification", () => {
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: true, currentLevel: "aal1" }),
      "verify",
    );
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: true, currentLevel: null }),
      "verify",
    );
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: true, currentLevel: "aal1" }),
      true,
    );
    assert.equal(
      buildAdminMfaGateRedirectPath("verify", "/admin/select"),
      `${ADMIN_MFA_VERIFY_PATH}?next=${encodeURIComponent("/admin/select")}`,
    );
  });

  it("allows admin with verified TOTP at AAL2", () => {
    assert.equal(
      resolveAdminMfaGate({ hasVerifiedTotp: true, currentLevel: "aal2" }),
      "allow",
    );
    assert.equal(
      buildAdminMfaGateRedirectPath("allow", "/admin/kingston-jiu-jitsu"),
      null,
    );
    assert.equal(adminNeedsMfaSetup({ hasVerifiedTotp: true, currentLevel: "aal2" }), false);
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: true, currentLevel: "aal2" }),
      false,
    );
  });
});

describe("isSafeAdminMfaNextPath", () => {
  it("allows admin and super-admin relative paths", () => {
    assert.equal(isSafeAdminMfaNextPath("/admin/select"), true);
    assert.equal(isSafeAdminMfaNextPath("/admin/kingston-jiu-jitsu/security"), true);
    assert.equal(isSafeAdminMfaNextPath("/super-admin"), true);
    assert.equal(isSafeAdminMfaNextPath("/super-admin/security"), true);
  });

  it("rejects open redirects, MFA flow paths, and non-admin portals", () => {
    assert.equal(isSafeAdminMfaNextPath("https://evil.example"), false);
    assert.equal(isSafeAdminMfaNextPath("//evil.example"), false);
    assert.equal(isSafeAdminMfaNextPath("/student-portal/login"), false);
    assert.equal(isSafeAdminMfaNextPath("/instructor-portal/login"), false);
    assert.equal(isSafeAdminMfaNextPath(ADMIN_MFA_VERIFY_PATH), false);
    assert.equal(isSafeAdminMfaNextPath(ADMIN_MFA_SETUP_PATH), false);
  });
});

describe("sanitizeAdminMfaNextPath / build paths", () => {
  it("falls back when next is unsafe", () => {
    assert.equal(
      sanitizeAdminMfaNextPath("//evil.example", "/admin/select"),
      "/admin/select",
    );
  });

  it("preserves a safe next in verify and setup URLs", () => {
    assert.equal(
      buildAdminMfaVerifyPath("/admin/select"),
      `${ADMIN_MFA_VERIFY_PATH}?next=%2Fadmin%2Fselect`,
    );
    assert.equal(
      buildAdminMfaSetupPath("/admin/kingston-jiu-jitsu"),
      `${ADMIN_MFA_SETUP_PATH}?next=%2Fadmin%2Fkingston-jiu-jitsu`,
    );
  });
});

describe("TOTP code helpers", () => {
  it("normalizes and validates 6-digit codes", () => {
    assert.equal(normalizeTotpCode(" 123 456 "), "123456");
    assert.equal(isValidTotpCode("123456"), true);
    assert.equal(isValidTotpCode("12 34 56"), true);
    assert.equal(isValidTotpCode("12345"), false);
    assert.equal(isValidTotpCode("abcdef"), false);
  });
});

describe("student/instructor authentication remains unaffected", () => {
  it("does not wire MFA helpers into student or instructor auth modules", () => {
    const studentAuth = readFileSync(
      join(here, "student-portal-auth.server.ts"),
      "utf8",
    );
    const studentShared = readFileSync(
      join(here, "student-portal-auth.shared.ts"),
      "utf8",
    );
    const instructorAuth = readFileSync(
      join(here, "instructor-portal-auth.server.ts"),
      "utf8",
    );
    const instructorShared = readFileSync(
      join(here, "instructor-portal-auth.shared.ts"),
      "utf8",
    );

    for (const source of [studentAuth, studentShared, instructorAuth, instructorShared]) {
      assert.equal(source.includes("admin-mfa"), false);
      assert.equal(source.includes("resolveAdminMfaGate"), false);
      assert.equal(source.includes("mfa."), false);
    }
  });

  it("does not treat student/instructor destinations as post-MFA admin redirects", () => {
    assert.equal(
      isSafeAdminMfaNextPath("/student-portal/kingston-jiu-jitsu/user-1"),
      false,
    );
    assert.equal(
      isSafeAdminMfaNextPath("/instructor-portal/kingston-jiu-jitsu"),
      false,
    );
    assert.equal(
      sanitizeAdminMfaNextPath(
        "/student-portal/login",
        "/admin/kingston-jiu-jitsu",
      ),
      "/admin/kingston-jiu-jitsu",
    );
  });
});
