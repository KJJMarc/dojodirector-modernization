import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BAHAMAS_JIU_JITSU_CLUB_SLUG } from "@/lib/clubs.shared";
import {
  isPublicAcademyThemedSlug,
  PUBLIC_ACADEMY_THEMED_SLUGS,
} from "@/lib/public-academy-theme.shared";

describe("public academy theme", () => {
  it("themes Bahamas public pages only", () => {
    assert.deepEqual(PUBLIC_ACADEMY_THEMED_SLUGS, [BAHAMAS_JIU_JITSU_CLUB_SLUG]);
    assert.equal(isPublicAcademyThemedSlug("bahamas-jiu-jitsu"), true);
    assert.equal(isPublicAcademyThemedSlug("kingston-jiu-jitsu"), false);
    assert.equal(isPublicAcademyThemedSlug("kingston-jiu-jitsu-kids"), false);
  });
});
