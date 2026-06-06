import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapPortalAuthError,
  PORTAL_AUTH_EXPIRED_LINK_MESSAGE,
  PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
  PORTAL_AUTH_NO_ACCESS_MESSAGE,
  PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
} from "@/lib/portal-auth-errors.shared";

describe("mapPortalAuthError", () => {
  it("maps invalid credentials to friendly copy", () => {
    assert.equal(
      mapPortalAuthError(new Error("Sign in failed. Check your email and password.")),
      PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
    );
    assert.equal(
      mapPortalAuthError(new Error("Invalid login credentials")),
      PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
    );
  });

  it("maps portal access denials to friendly copy", () => {
    assert.equal(
      mapPortalAuthError(
        new Error("You do not have permission to access the admin area."),
      ),
      PORTAL_AUTH_NO_ACCESS_MESSAGE,
    );
  });

  it("maps expired setup and reset links to friendly copy", () => {
    assert.equal(
      mapPortalAuthError(new Error("Email link is invalid or has expired")),
      PORTAL_AUTH_EXPIRED_LINK_MESSAGE,
    );
  });

  it("hides framework and infrastructure errors", () => {
    assert.equal(
      mapPortalAuthError(
        new Error("An error occurred in the Server Components render"),
      ),
      PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
    );
    assert.equal(
      mapPortalAuthError(new Error("Failed to load member for portal activation: timeout")),
      PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
    );
  });

  it("passes through intentional validation messages", () => {
    assert.equal(
      mapPortalAuthError(new Error("Password must be at least 8 characters.")),
      "Password must be at least 8 characters.",
    );
  });
});
