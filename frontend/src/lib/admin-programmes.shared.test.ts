import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAddStudentBookingAccessOptions,
  buildAddStudentProgrammeMembershipOptions,
  buildAdminAreaProgrammeClassScope,
  buildStudentProfileAdminPath,
  classBelongsToAdminAreaProgrammeScope,
  filterProgrammesForStudentAccessForms,
  formatStudentProfileBackLabel,
  programmeStudentsAdminPath,
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

  it("does not fall back to the global portal-access type list when club types are omitted", () => {
    const membershipOptions = buildAddStudentProgrammeMembershipOptions("bjj", []);
    const bookingOptions = buildAddStudentBookingAccessOptions("bjj", []);

    assert.deepEqual(membershipOptions, []);
    assert.deepEqual(bookingOptions, []);
    assert.notEqual(membershipOptions.length, STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES.length);
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
