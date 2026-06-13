import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAcademyEmailHeadersPreview,
  formatAcademyFromAddress,
  resolveSenderDisplayName,
} from "./academy-email.shared.ts";

describe("resolveSenderDisplayName", () => {
  it("returns stored name when set", () => {
    assert.equal(resolveSenderDisplayName("KJJ Kids", "Kingston Jiu Jitsu Kids"), "KJJ Kids");
  });

  it("defaults to academy name when empty", () => {
    assert.equal(resolveSenderDisplayName("", "Kingston Jiu Jitsu"), "Kingston Jiu Jitsu");
    assert.equal(resolveSenderDisplayName(null, "Kingston Jiu Jitsu Kids"), "Kingston Jiu Jitsu Kids");
  });
});

describe("formatAcademyFromAddress", () => {
  it("uses platform address with academy display name", () => {
    assert.equal(
      formatAcademyFromAddress(
        { senderDisplayName: "Kingston Jiu Jitsu", clubName: "Kingston Jiu Jitsu" },
        "admin@kingstonjiujitsu.com",
      ),
      "Kingston Jiu Jitsu <admin@kingstonjiujitsu.com>",
    );
  });

  it("defaults display name to academy name", () => {
    assert.equal(
      formatAcademyFromAddress(
        { senderDisplayName: "", clubName: "Kingston Jiu Jitsu Kids" },
        "notifications@example.com",
      ),
      "Kingston Jiu Jitsu Kids <notifications@example.com>",
    );
  });
});

describe("buildAcademyEmailHeadersPreview", () => {
  it("builds from and reply-to preview lines", () => {
    const preview = buildAcademyEmailHeadersPreview({
      senderDisplayName: "",
      clubName: "Kingston Jiu Jitsu",
      replyToEmail: "admin@kingstonjiujitsu.com",
      platformSenderEmail: "admin@kingstonjiujitsu.com",
    });

    assert.equal(preview.from, "Kingston Jiu Jitsu <admin@kingstonjiujitsu.com>");
    assert.equal(preview.replyTo, "admin@kingstonjiujitsu.com");
  });
});
