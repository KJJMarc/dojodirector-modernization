import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_MFA_VERIFY_PATH,
  adminNeedsMfaChallenge,
  buildAdminMfaVerifyPath,
  isSafeAdminMfaNextPath,
  isValidTotpCode,
  normalizeTotpCode,
  sanitizeAdminMfaNextPath,
} from "@/lib/admin-mfa.shared";

describe("adminNeedsMfaChallenge", () => {
  it("does not challenge when no verified TOTP exists", () => {
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: false, currentLevel: "aal1" }),
      false,
    );
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: false, currentLevel: null }),
      false,
    );
  });

  it("challenges when verified TOTP exists and session is not AAL2", () => {
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: true, currentLevel: "aal1" }),
      true,
    );
    assert.equal(
      adminNeedsMfaChallenge({ hasVerifiedTotp: true, currentLevel: null }),
      true,
    );
  });

  it("does not challenge when already AAL2", () => {
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

  it("rejects open redirects and non-admin portals", () => {
    assert.equal(isSafeAdminMfaNextPath("https://evil.example"), false);
    assert.equal(isSafeAdminMfaNextPath("//evil.example"), false);
    assert.equal(isSafeAdminMfaNextPath("/student-portal/login"), false);
    assert.equal(isSafeAdminMfaNextPath("/instructor-portal/login"), false);
    assert.equal(isSafeAdminMfaNextPath(ADMIN_MFA_VERIFY_PATH), false);
  });
});

describe("sanitizeAdminMfaNextPath / buildAdminMfaVerifyPath", () => {
  it("falls back when next is unsafe", () => {
    assert.equal(
      sanitizeAdminMfaNextPath("//evil.example", "/admin/select"),
      "/admin/select",
    );
  });

  it("preserves a safe next in the verify URL", () => {
    assert.equal(
      buildAdminMfaVerifyPath("/admin/select"),
      `${ADMIN_MFA_VERIFY_PATH}?next=%2Fadmin%2Fselect`,
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
