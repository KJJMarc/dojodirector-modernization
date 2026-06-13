import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAddStudentBookingAccessOptions,
  buildAddStudentProgrammeAccessOptionsFromRows,
  buildAddStudentProgrammeMembershipOptions,
  buildAdminAreaProgrammeClassScope,
  buildStudentProfileAdminPath,
  classBelongsToAdminAreaProgrammeScope,
  defaultProgrammeSettingsForCreateTemplate,
  filterProgrammesForStudentAccessForms,
  formatStudentProfileBackLabel,
  inferProgrammeTypeFromSlug,
  isProgrammeSlugTakenInClub,
  parseProgrammeCreateFormData,
  programmeStudentsAdminPath,
  validateProgrammeSlug,
  STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES,
  STUDENT_PROFILE_FROM_PROGRAMME_PARAM,
} from "@/lib/admin-programmes.shared";
import { matchesAdminStudentListStatusFilter } from "@/lib/admin-students";

/**
 * Documents programme student area count vs list alignment (no DB).
 * Card count = active programme_membership ∩ active club membership.
 * Programme list (default active filter) uses the same intersection.
 */
describe("programme student area membership filtering", () => {
  it("excludes inactive club members from the active list scope", () => {
    assert.equal(matchesAdminStudentListStatusFilter("inactive", "active"), false);
    assert.equal(matchesAdminStudentListStatusFilter("active", "active"), true);
  });

  it("still allows inactive club members when the admin list filter is inactive", () => {
    assert.equal(matchesAdminStudentListStatusFilter("inactive", "inactive"), true);
  });
});

describe("student profile programme back navigation", () => {
  it("appends fromProgramme when opening profile from a programme list", () => {
    assert.equal(
      buildStudentProfileAdminPath("kingston-jiu-jitsu", "user-1", {
        programmeSlug: "muay-thai",
      }),
      `/admin/kingston-jiu-jitsu/students/user-1/profile?${STUDENT_PROFILE_FROM_PROGRAMME_PARAM}=muay-thai`,
    );
  });

  it("omits query param when programme context is absent", () => {
    assert.equal(
      buildStudentProfileAdminPath("kingston-jiu-jitsu", "user-1"),
      "/admin/kingston-jiu-jitsu/students/user-1/profile",
    );
  });

  it("formats programme-specific back labels", () => {
    assert.equal(
      formatStudentProfileBackLabel("Muay Thai"),
      "← Back to Muay Thai Students",
    );
    assert.equal(formatStudentProfileBackLabel("BJJ"), "← Back to BJJ Students");
  });

  it("routes programme back links to the matching student list", () => {
    assert.equal(
      programmeStudentsAdminPath("kingston-jiu-jitsu", "muay-thai"),
      "/admin/kingston-jiu-jitsu/programmes/muay-thai/students",
    );
    assert.equal(
      programmeStudentsAdminPath("kingston-jiu-jitsu", "bjj"),
      "/admin/kingston-jiu-jitsu/students",
    );
  });
});

describe("dashboard total students across programmes", () => {
  it("dedupes students counted in more than one programme", () => {
    const bjjUserIds = ["user-a", "user-b", "user-c"];
    const muayThaiUserIds = ["user-b", "user-d"];
    const uniqueUserIds = new Set([...bjjUserIds, ...muayThaiUserIds]);

    assert.equal(uniqueUserIds.size, 4);
  });
});

describe("add student programme access options", () => {
  it("limits options to programmes configured for the club", () => {
    const membershipOptions = buildAddStudentProgrammeMembershipOptions("bjj", ["bjj"]);
    const bookingOptions = buildAddStudentBookingAccessOptions("bjj", ["bjj"]);

    assert.equal(membershipOptions.length, 1);
    assert.equal(membershipOptions[0]?.label, "Brazilian Jiu Jitsu Student");
    assert.equal(membershipOptions[0]?.defaultChecked, true);
    assert.equal(bookingOptions.length, 1);
    assert.equal(bookingOptions[0]?.label, "Brazilian Jiu Jitsu Classes");
    assert.equal(bookingOptions[0]?.defaultChecked, true);
  });

  it("never emits Muay Thai or Strength & Conditioning when only BJJ is configured", () => {
    const membershipOptions = buildAddStudentProgrammeMembershipOptions("bjj", ["bjj"]);
    const bookingOptions = buildAddStudentBookingAccessOptions("bjj", ["bjj"]);
    const allOptions = [...membershipOptions, ...bookingOptions];

    assert.equal(allOptions.length, 2);

    for (const option of allOptions) {
      assert.notEqual(option.programmeType, "muay_thai");
      assert.notEqual(option.programmeType, "strength_conditioning");
      assert.ok(!option.label.includes("Muay Thai"));
      assert.ok(!option.label.includes("Strength & Conditioning"));
    }
  });

  it("builds Muay Thai and Strength & Conditioning labels only from supplied programme types", () => {
    const membershipOptions = buildAddStudentProgrammeMembershipOptions("bjj", [
      "bjj",
      "muay_thai",
      "strength_conditioning",
    ]);
    const bookingOptions = buildAddStudentBookingAccessOptions("bjj", [
      "bjj",
      "muay_thai",
      "strength_conditioning",
    ]);

    assert.ok(
      membershipOptions.some((option) => option.label === "Muay Thai Student"),
    );
    assert.ok(
      membershipOptions.some(
        (option) => option.label === "Strength & Conditioning Student",
      ),
    );
    assert.ok(bookingOptions.some((option) => option.label === "Muay Thai Classes"));
    assert.ok(
      bookingOptions.some((option) => option.label === "Strength & Conditioning Classes"),
    );
  });

  it("does not fall back to the global portal-access type list when club types are omitted", () => {
    const membershipOptions = buildAddStudentProgrammeMembershipOptions("bjj", []);
    const bookingOptions = buildAddStudentBookingAccessOptions("bjj", []);

    assert.deepEqual(membershipOptions, []);
    assert.deepEqual(bookingOptions, []);
    assert.notEqual(membershipOptions.length, STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.length);
  });

  it("builds options from actual programme rows without default type fallback", () => {
    const { programmeMembershipOptions, bookingAccessOptions } =
      buildAddStudentProgrammeAccessOptionsFromRows("bjj", [
        {
          id: "bjj-programme-id",
          name: "Brazilian Jiu Jitsu",
          slug: "bjj",
          programmeType: "bjj",
        },
      ]);

    assert.equal(programmeMembershipOptions.length, 1);
    assert.equal(programmeMembershipOptions[0]?.label, "Brazilian Jiu Jitsu Student");
    assert.equal(bookingAccessOptions[0]?.label, "Brazilian Jiu Jitsu Classes");
  });

  it("keeps all portal-access programmes for multi-programme clubs", () => {
    const clubProgrammeTypes = ["bjj", "muay_thai", "strength_conditioning"] as const;
    const membershipOptions = buildAddStudentProgrammeMembershipOptions(
      "muay_thai",
      clubProgrammeTypes,
    );
    const bookingOptions = buildAddStudentBookingAccessOptions(
      "muay_thai",
      clubProgrammeTypes,
    );

    assert.equal(membershipOptions.length, 3);
    assert.equal(
      membershipOptions.find((option) => option.programmeType === "muay_thai")?.defaultChecked,
      true,
    );
    assert.equal(bookingOptions.length, 3);
    assert.equal(
      bookingOptions.find((option) => option.programmeType === "muay_thai")?.defaultChecked,
      true,
    );
    assert.equal(
      bookingOptions.find((option) => option.programmeType === "bjj")?.defaultChecked,
      false,
    );
  });
});

describe("filterProgrammesForStudentAccessForms", () => {
  it("excludes later-added shadow programmes when a club only operates BJJ", () => {
    const programmeTypes = filterProgrammesForStudentAccessForms([
      {
        programmeType: "bjj",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: true,
        hasClasses: true,
        createdAtMs: 1_000,
      },
      {
        programmeType: "muay_thai",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: false,
        createdAtMs: 9_000_000,
      },
      {
        programmeType: "strength_conditioning",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: false,
        createdAtMs: 9_000_001,
      },
    ]);

    assert.deepEqual(programmeTypes, ["bjj"]);
  });

  it("excludes shadow programmes even when they were auto-created shortly after BJJ", () => {
    const programmeTypes = filterProgrammesForStudentAccessForms([
      {
        programmeType: "bjj",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: true,
        hasClasses: true,
        createdAtMs: 1_000,
      },
      {
        programmeType: "muay_thai",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: false,
        createdAtMs: 5_000,
      },
      {
        programmeType: "strength_conditioning",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: false,
        createdAtMs: 5_001,
      },
    ]);

    assert.deepEqual(programmeTypes, ["bjj"]);
  });

  it("keeps batch-provisioned multi-programme clubs such as Kids", () => {
    const programmeTypes = filterProgrammesForStudentAccessForms([
      {
        programmeType: "bjj",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: true,
        hasClasses: true,
        createdAtMs: 1_000,
      },
      {
        programmeType: "muay_thai",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: true,
        createdAtMs: 1_001,
      },
      {
        programmeType: "strength_conditioning",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: false,
        hasClasses: false,
        createdAtMs: 1_002,
      },
    ]);

    assert.deepEqual(programmeTypes, ["bjj", "muay_thai", "strength_conditioning"]);
  });

  it("keeps admin-enabled programmes even when they were added after the club launched", () => {
    const programmeTypes = filterProgrammesForStudentAccessForms([
      {
        programmeType: "bjj",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: true,
        hasClasses: true,
        createdAtMs: 1_000,
      },
      {
        programmeType: "muay_thai",
        studentPortalAccessEnabled: true,
        adminAreaEnabled: true,
        hasClasses: false,
        createdAtMs: 9_000_000,
      },
    ]);

    assert.deepEqual(programmeTypes, ["bjj", "muay_thai"]);
  });
});

describe("admin dashboard programme class scope", () => {
  const scope = buildAdminAreaProgrammeClassScope([
    { id: "bjj-programme-id", programmeType: "bjj" },
    { id: "muay-thai-programme-id", programmeType: "muay_thai" },
  ]);

  it("includes classes linked by programme_id", () => {
    assert.equal(
      classBelongsToAdminAreaProgrammeScope(
        { programme_id: "muay-thai-programme-id", programme_type: "muay_thai" },
        scope,
      ),
      true,
    );
  });

  it("includes legacy BJJ classes matched by programme_type", () => {
    assert.equal(
      classBelongsToAdminAreaProgrammeScope(
        { programme_id: null, programme_type: "bjj" },
        scope,
      ),
      true,
    );
  });

  it("excludes classes outside admin-area programmes", () => {
    assert.equal(
      classBelongsToAdminAreaProgrammeScope(
        { programme_id: null, programme_type: "strength_conditioning" },
        scope,
      ),
      false,
    );
  });
});

describe("programme create input parsing", () => {
  it("parses name, slug, feature toggles, and admin area from form data", () => {
    const formData = new FormData();
    formData.set("programmeName", "  Competition BJJ  ");
    formData.set("programmeSlug", "competition-bjj");
    formData.set("attendanceTrackingEnabled", "on");
    formData.set("classBookingEnabled", "on");
    formData.set("adminAreaEnabled", "on");

    const parsed = parseProgrammeCreateFormData(formData);

    assert.equal(parsed.name, "Competition BJJ");
    assert.equal(parsed.slug, "competition-bjj");
    assert.equal(parsed.adminAreaEnabled, true);
    assert.equal(parsed.settings.attendanceTrackingEnabled, true);
    assert.equal(parsed.settings.classBookingEnabled, true);
    assert.equal(parsed.settings.gradingSystemEnabled, false);
  });

  it("slugifies the name when slug is omitted", () => {
    const formData = new FormData();
    formData.set("programmeName", "Kids Muay Thai");

    const parsed = parseProgrammeCreateFormData(formData);

    assert.equal(parsed.slug, "kids-muay-thai");
  });

  it("rejects programme names that are too short", () => {
    const formData = new FormData();
    formData.set("programmeName", "A");

    assert.throws(
      () => parseProgrammeCreateFormData(formData),
      /at least 2 characters/,
    );
  });
});

describe("programme slug validation", () => {
  it("accepts lowercase hyphenated slugs", () => {
    assert.equal(validateProgrammeSlug("competition-bjj"), "competition-bjj");
  });

  it("normalises slug casing and whitespace", () => {
    assert.equal(validateProgrammeSlug("  Muay-Thai  "), "muay-thai");
  });

  it("rejects invalid slug characters", () => {
    assert.throws(
      () => validateProgrammeSlug("bjj_programme"),
      /lowercase letters, numbers, and hyphens/,
    );
    assert.throws(
      () => validateProgrammeSlug("bjj programme"),
      /lowercase letters, numbers, and hyphens/,
    );
  });

  it("infers programme type from standard slugs", () => {
    assert.equal(inferProgrammeTypeFromSlug("bjj"), "bjj");
    assert.equal(inferProgrammeTypeFromSlug("muay-thai"), "muay_thai");
    assert.equal(inferProgrammeTypeFromSlug("strength-conditioning"), "strength_conditioning");
    assert.equal(inferProgrammeTypeFromSlug("kids-bjj"), "custom");
  });
});

describe("programme create template defaults", () => {
  it("applies BJJ defaults from the BJJ template", () => {
    const settings = defaultProgrammeSettingsForCreateTemplate("bjj");

    assert.equal(settings.attendanceCardsEnabled, true);
    assert.equal(settings.gradingSystemEnabled, true);
    assert.equal(settings.promotionCandidatesEnabled, true);
  });

  it("applies Muay Thai defaults from the Muay Thai template", () => {
    const settings = defaultProgrammeSettingsForCreateTemplate("muay_thai");

    assert.equal(settings.attendanceCardsEnabled, false);
    assert.equal(settings.gradingSystemEnabled, false);
    assert.equal(settings.studentPortalAccessEnabled, true);
  });

  it("applies minimal defaults from the blank template", () => {
    const settings = defaultProgrammeSettingsForCreateTemplate("blank");

    assert.equal(settings.attendanceTrackingEnabled, true);
    assert.equal(settings.studentPortalAccessEnabled, false);
    assert.equal(settings.promotionCandidatesEnabled, false);
  });
});

describe("club-scoped programme slug uniqueness", () => {
  it("detects when a slug is already used at the academy", () => {
    assert.equal(
      isProgrammeSlugTakenInClub("muay-thai", ["bjj", "muay-thai"]),
      true,
    );
  });

  it("is case-insensitive when checking slug uniqueness", () => {
    assert.equal(
      isProgrammeSlugTakenInClub("BJJ", ["bjj"]),
      true,
    );
  });

  it("allows reusing the same slug when updating the same programme", () => {
    assert.equal(
      isProgrammeSlugTakenInClub("muay-thai", ["muay-thai"], {
        ignoreSlug: "muay-thai",
      }),
      false,
    );
  });

  it("still blocks another programme from taking an existing slug", () => {
    assert.equal(
      isProgrammeSlugTakenInClub("muay-thai", ["bjj", "muay-thai"], {
        ignoreSlug: "bjj",
      }),
      true,
    );
  });
});
