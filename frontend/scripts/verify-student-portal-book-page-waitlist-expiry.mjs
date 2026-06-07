/**
 * Regression checks: waitlist expiry stays off the read-only Book a Class list path
 * but remains on booking/waitlist decision paths.
 *
 * Usage: node scripts/verify-student-portal-book-page-waitlist-expiry.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

function isActiveWaitlistOfferAt(status, expiresAt, nowIso) {
  return status === "offered" && Boolean(expiresAt && expiresAt > nowIso);
}

const now = "2026-06-05T12:00:00.000Z";
assert(
  isActiveWaitlistOfferAt("offered", "2026-06-05T12:30:00.000Z", now),
  "Future offer expiry counts as active on read-only paths",
);
assert(
  !isActiveWaitlistOfferAt("offered", "2026-06-05T11:30:00.000Z", now),
  "Past offer expiry is ignored on read-only paths",
);
assert(
  !isActiveWaitlistOfferAt("waiting", "2026-06-05T12:30:00.000Z", now),
  "Waiting rows are not active offers",
);

const bookingLoader = read("src/lib/student-portal-booking.server.ts");
const waitlistServer = read("src/lib/session-waitlist.server.ts");

assert(
  !bookingLoader.includes("processExpiredWaitlistOffersForSessions"),
  "Book page loader does not run waitlist expiry on read",
);

assert(
  bookingLoader.includes("skipExpiryProcessing: true"),
  "Book page waitlist loaders skip side-effect expiry processing",
);

assert(
  bookingLoader.includes("loadSessionWaitlistDisplayAndAvailabilityBySessionId"),
  "Book page uses a single combined waitlist query",
);

assert(
  waitlistServer.includes("await processExpiredWaitlistOffersForSession(sessionId);"),
  "Accept/decline waitlist paths still process expiry for the target session",
);

assert(
  waitlistServer.includes(
    "loadSessionWaitlistBookingAvailabilityBySessionId([sessionId])",
  ),
  "Single-session availability checks still load waitlist state with expiry processing",
);

assert(
  waitlistServer.includes("isActiveWaitlistOfferAt"),
  "Read-only waitlist display ignores expired offers without mutating rows",
);

const clubServer = read("src/lib/student-portal-club.server.ts");
const authServer = read("src/lib/student-portal-auth.server.ts");
const agreementsServer = read("src/lib/student-portal-agreements.server.ts");
const clubsServer = read("src/lib/clubs.server.ts");

assert(
  clubServer.includes('import { cache } from "react"') &&
    clubServer.includes("export const loadStudentPortalAccessibleClubs = cache") &&
    clubServer.includes("export const userHasActiveStudentPortalAccessAtClub = cache"),
  "Student portal club loaders use React.cache request deduplication",
);

assert(
  clubServer.includes("loadClubIdsWithActiveStudentPortalProgrammeMembershipForUser"),
  "Accessible clubs batch programme membership checks across clubs",
);

assert(
  authServer.includes("export const resolveStudentPortalSessionState = cache") &&
    authServer.includes("export const getAuthenticatedStudentPortalProfile = cache"),
  "Student portal session/auth resolution is cached per request",
);

assert(
  agreementsServer.includes("loadStudentAgreementGateSnapshot = cache"),
  "Student agreement gate checks are cached per request",
);

assert(
  clubsServer.includes("export const getClubBySlug = cache"),
  "Club slug lookups are cached per request",
);

console.log("\nAll student portal book page waitlist expiry checks passed.");
