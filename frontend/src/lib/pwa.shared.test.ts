import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PWA_APP_ENTRY_PATH,
  resolveAppStandaloneCloseHref,
} from "@/lib/pwa.shared";

describe("resolveAppStandaloneCloseHref", () => {
  it("returns the app home path used by the standalone × control", () => {
    assert.equal(resolveAppStandaloneCloseHref(), "/app");
    assert.equal(resolveAppStandaloneCloseHref(), PWA_APP_ENTRY_PATH);
  });
});
