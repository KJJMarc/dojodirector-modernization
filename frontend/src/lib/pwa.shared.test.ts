import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendAppStandaloneReturnTo,
  isSafeAppStandaloneReturnTo,
  PWA_APP_ENTRY_PATH,
  resolveAppStandaloneCloseHref,
} from "@/lib/pwa.shared";

describe("isSafeAppStandaloneReturnTo", () => {
  it("allows portal and app home paths", () => {
    assert.equal(isSafeAppStandaloneReturnTo("/app"), true);
    assert.equal(
      isSafeAppStandaloneReturnTo(
        "/student-portal/kingston-jiu-jitsu/11111111-1111-4111-8111-111111111111",
      ),
      true,
    );
    assert.equal(
      isSafeAppStandaloneReturnTo("/instructor-portal/kingston-jiu-jitsu"),
      true,
    );
  });

  it("rejects external or protocol-relative destinations", () => {
    assert.equal(isSafeAppStandaloneReturnTo("https://evil.example"), false);
    assert.equal(isSafeAppStandaloneReturnTo("//evil.example"), false);
    assert.equal(isSafeAppStandaloneReturnTo("/admin/secret"), false);
  });
});

describe("appendAppStandaloneReturnTo", () => {
  it("adds returnTo for public academy hrefs", () => {
    assert.equal(
      appendAppStandaloneReturnTo(
        "/adult-belt-rankings",
        "/student-portal/kingston-jiu-jitsu/11111111-1111-4111-8111-111111111111",
      ),
      "/adult-belt-rankings?returnTo=%2Fstudent-portal%2Fkingston-jiu-jitsu%2F11111111-1111-4111-8111-111111111111",
    );
  });

  it("leaves href unchanged for unsafe returnTo", () => {
    assert.equal(
      appendAppStandaloneReturnTo("/adult-belt-rankings", "https://evil.example"),
      "/adult-belt-rankings",
    );
  });
});

describe("resolveAppStandaloneCloseHref", () => {
  it("prefers a safe returnTo portal path over app home", () => {
    const portal =
      "/student-portal/kingston-jiu-jitsu/11111111-1111-4111-8111-111111111111";
    assert.equal(resolveAppStandaloneCloseHref(portal), portal);
  });

  it("falls back to app home when returnTo is missing or unsafe", () => {
    assert.equal(resolveAppStandaloneCloseHref(null), PWA_APP_ENTRY_PATH);
    assert.equal(resolveAppStandaloneCloseHref("/admin"), PWA_APP_ENTRY_PATH);
  });
});
