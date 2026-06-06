/**
 * Regression checks for portal auth error mapping.
 * Usage: node scripts/verify-portal-auth-errors.mjs
 */

const PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const PORTAL_AUTH_NO_ACCESS_MESSAGE =
  "You do not currently have access to this portal. Please contact your academy administrator.";
const PORTAL_AUTH_EXPIRED_LINK_MESSAGE =
  "This link has expired. Please request a new one.";
const PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE =
  "Sorry, something went wrong. Please try again shortly.";

function mapPortalAuthError(error) {
  const message = error instanceof Error ? error.message.trim() : String(error).trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("sign in failed") ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE;
  }

  if (
    lower.includes("do not have permission to access the admin") ||
    lower.includes("do not currently have access to this portal")
  ) {
    return PORTAL_AUTH_NO_ACCESS_MESSAGE;
  }

  if (lower.includes("invalid or has expired") || lower.includes("link has expired")) {
    return PORTAL_AUTH_EXPIRED_LINK_MESSAGE;
  }

  if (
    lower.includes("server components render") ||
    lower.includes("failed to load")
  ) {
    return PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE;
  }

  if (message === "Password must be at least 8 characters.") {
    return message;
  }

  return PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE;
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

assert(
  mapPortalAuthError(new Error("Invalid login credentials")) ===
    PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
  "Invalid credentials map to friendly message",
);

assert(
  mapPortalAuthError(new Error("You do not have permission to access the admin area.")) ===
    PORTAL_AUTH_NO_ACCESS_MESSAGE,
  "Admin access denial maps to portal no-access message",
);

assert(
  mapPortalAuthError(new Error("Email link is invalid or has expired")) ===
    PORTAL_AUTH_EXPIRED_LINK_MESSAGE,
  "Expired links map to friendly message",
);

assert(
  mapPortalAuthError(new Error("An error occurred in the Server Components render")) ===
    PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
  "Framework errors map to generic message",
);

assert(
  mapPortalAuthError(new Error("Failed to load member for portal activation: timeout")) ===
    PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
  "Infrastructure errors map to generic message",
);

console.log("\nAll portal auth error mapping checks passed.");
