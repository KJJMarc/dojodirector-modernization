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

console.log("\nAll student portal book page waitlist expiry checks passed.");
