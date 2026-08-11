import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePortalMessageLinkHref,
  splitPortalMessageBodyWithLinks,
  trimPortalMessageUrlMatch,
} from "./portal-messages.shared.ts";

describe("portal message linkify", () => {
  it("splits https URLs into link segments that open with absolute href", () => {
    const segments = splitPortalMessageBodyWithLinks(
      "Book here: https://example.com/book?club=kjj thanks",
    );

    assert.deepEqual(segments, [
      { type: "text", value: "Book here: " },
      {
        type: "link",
        value: "https://example.com/book?club=kjj",
        href: "https://example.com/book?club=kjj",
      },
      { type: "text", value: " thanks" },
    ]);
  });

  it("normalises www links to https", () => {
    assert.equal(
      normalizePortalMessageLinkHref("www.kingstonjiujitsu.com/timetable"),
      "https://www.kingstonjiujitsu.com/timetable",
    );

    const segments = splitPortalMessageBodyWithLinks(
      "Timetable: www.kingstonjiujitsu.com/timetable",
    );
    const link = segments.find((segment) => segment.type === "link");
    assert.ok(link && link.type === "link");
    assert.equal(link.href, "https://www.kingstonjiujitsu.com/timetable");
    assert.equal(link.value, "www.kingstonjiujitsu.com/timetable");
  });

  it("keeps trailing punctuation outside the link", () => {
    assert.deepEqual(trimPortalMessageUrlMatch("https://example.com/page)."), {
      url: "https://example.com/page",
      trailing: ").",
    });

    const segments = splitPortalMessageBodyWithLinks(
      "See https://example.com/page).",
    );

    assert.deepEqual(segments, [
      { type: "text", value: "See " },
      {
        type: "link",
        value: "https://example.com/page",
        href: "https://example.com/page",
      },
      { type: "text", value: ")." },
    ]);
  });

  it("leaves non-URL text unchanged", () => {
    assert.deepEqual(splitPortalMessageBodyWithLinks("No links here."), [
      { type: "text", value: "No links here." },
    ]);
  });

  it("handles multiple lines and multiple URLs", () => {
    const body = "Hi\nhttps://a.example/1\nand https://b.example/2";
    const links = splitPortalMessageBodyWithLinks(body).filter(
      (segment) => segment.type === "link",
    );

    assert.equal(links.length, 2);
    assert.equal(links[0].href, "https://a.example/1");
    assert.equal(links[1].href, "https://b.example/2");
  });
});
