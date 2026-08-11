import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  absoluteCanonicalUrl,
  CANONICAL_SITE_ORIGIN,
  CANONICAL_SITEMAP_URL,
  getPublicSitemapEntries,
  getRobotsDisallowPaths,
} from "./seo-public-routes.shared.ts";

describe("seo public sitemap catalogue", () => {
  it("uses the production www origin", () => {
    assert.equal(CANONICAL_SITE_ORIGIN, "https://www.dojodirector.com");
    assert.equal(CANONICAL_SITEMAP_URL, "https://www.dojodirector.com/sitemap.xml");
    assert.equal(absoluteCanonicalUrl("/"), "https://www.dojodirector.com/");
    assert.equal(
      absoluteCanonicalUrl("/terms"),
      "https://www.dojodirector.com/terms",
    );
  });

  it("includes platform marketing and legal pages", () => {
    const paths = getPublicSitemapEntries().map((entry) => entry.path);

    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/terms"));
    assert.ok(paths.includes("/privacy-policy"));
    assert.ok(paths.includes("/cookie-policy"));
  });

  it("includes deliberate public academy content pages", () => {
    const paths = getPublicSitemapEntries().map((entry) => entry.path);

    assert.ok(paths.includes("/adult-belt-rankings"));
    assert.ok(paths.includes("/bahamas-jiu-jitsu/adult-belt-rankings"));
    assert.ok(paths.includes("/kingston-jiu-jitsu-kids/junior-belt-rankings"));
    assert.ok(paths.includes("/bahamas-jiu-jitsu/junior-belt-rankings"));
    assert.ok(paths.includes("/student-of-the-year"));
    assert.ok(paths.includes("/kingston-jiu-jitsu/timetable"));
    assert.ok(paths.includes("/kingston-jiu-jitsu-kids/timetable"));
    assert.ok(paths.includes("/bahamas-jiu-jitsu/timetable"));
  });

  it("excludes booking, trial enquiry, admin, portals and auth paths", () => {
    const paths = getPublicSitemapEntries().map((entry) => entry.path);
    const joined = paths.join("\n");

    assert.equal(paths.includes("/book"), false);
    assert.equal(paths.includes("/privacy"), false);
    assert.doesNotMatch(joined, /\/book$/m);
    assert.doesNotMatch(joined, /trial-enquiry/);
    assert.doesNotMatch(joined, /\/admin/);
    assert.doesNotMatch(joined, /student-portal/);
    assert.doesNotMatch(joined, /instructor-portal/);
    assert.doesNotMatch(joined, /forgot-password|reset-password|setup-password/);
  });

  it("produces only absolute www URLs with no private path segments", () => {
    for (const entry of getPublicSitemapEntries()) {
      const url = absoluteCanonicalUrl(entry.path);
      assert.match(url, /^https:\/\/www\.dojodirector\.com(\/|$)/);
      assert.doesNotMatch(url, /admin|portal|password|attendance|api\//i);
    }
  });

  it("disallows non-public product areas in robots", () => {
    const disallow = getRobotsDisallowPaths().join("\n");

    assert.match(disallow, /\/admin/);
    assert.match(disallow, /\/student-portal/);
    assert.match(disallow, /\/instructor-portal/);
    assert.match(disallow, /\/forgot-password/);
    assert.match(disallow, /\/book/);
    assert.match(disallow, /\/api/);
  });
});
