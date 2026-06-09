import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthConfirmRedirectPath,
  buildPasswordResetConfirmUrl,
} from "@/lib/password-reset.shared";
import { buildPortalSetupConfirmUrl } from "@/lib/portal-setup.shared";

describe("portal auth email link URLs", () => {
  const siteOrigin = "https://www.dojodirector.com";
  const token = "hashed-token-example";

  it("does not put /auth/confirm in password reset entry emails", () => {
    const url = buildPasswordResetConfirmUrl(siteOrigin, token);

    assert.equal(
      url,
      "https://www.dojodirector.com/reset-password?token_hash=hashed-token-example&type=recovery",
    );
    assert.ok(!url.includes("/auth/confirm"));
  });

  it("does not put /auth/confirm in portal setup entry emails", () => {
    const url = buildPortalSetupConfirmUrl(siteOrigin, token, "student");

    assert.ok(url.startsWith("https://www.dojodirector.com/setup-password?"));
    assert.ok(url.includes("token_hash=hashed-token-example"));
    assert.ok(url.includes("type=recovery"));
    assert.ok(url.includes("setup=1"));
    assert.ok(url.includes("context=student"));
    assert.ok(!url.includes("/auth/confirm"));
  });

  it("builds the internal confirm path used after click-through", () => {
    const path = buildAuthConfirmRedirectPath(token, "/reset-password?setup=1&context=student");

    assert.equal(
      path,
      "/auth/confirm?token_hash=hashed-token-example&type=recovery&next=%2Freset-password%3Fsetup%3D1%26context%3Dstudent",
    );
  });
});
