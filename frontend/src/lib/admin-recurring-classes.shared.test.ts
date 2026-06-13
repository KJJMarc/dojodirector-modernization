import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  buildFallbackRecurringClassProgrammeOptions,
  buildRecurringClassProgrammeOptionsFromRows,
  ensureRecurringClassProgrammeOptionPresent,
  isRecurringClassProgrammeTypeAllowed,
  resolveDefaultRecurringClassProgrammeType,
} from "@/lib/admin-recurring-classes.shared";

test("buildRecurringClassProgrammeOptionsFromRows returns only active academy programmes", () => {
  const options = buildRecurringClassProgrammeOptionsFromRows([
    {
      id: "bahamas-bjj",
      name: "Brazilian Jiu Jitsu",
      programmeType: "bjj",
      isActive: true,
    },
    {
      id: "bahamas-muay-thai",
      name: "Muay Thai",
      programmeType: "muay_thai",
      isActive: false,
    },
  ]);

  assert.deepEqual(options, [
    {
      programmeId: "bahamas-bjj",
      programmeType: "bjj",
      label: "BJJ",
    },
  ]);
});

test("buildRecurringClassProgrammeOptionsFromRows excludes custom unless configured", () => {
  const withoutCustom = buildRecurringClassProgrammeOptionsFromRows([
    {
      id: "kingston-bjj",
      name: "Brazilian Jiu Jitsu",
      programmeType: "bjj",
      isActive: true,
    },
  ]);

  assert.equal(
    withoutCustom.some((option) => option.programmeType === "custom"),
    false,
  );

  const withCustom = buildRecurringClassProgrammeOptionsFromRows([
    {
      id: "custom-programme",
      name: "Competition Team",
      programmeType: "custom",
      isActive: true,
    },
  ]);

  assert.deepEqual(withCustom, [
    {
      programmeId: "custom-programme",
      programmeType: "custom",
      label: "Custom",
    },
  ]);
});

test("buildFallbackRecurringClassProgrammeOptions scopes Bahamas to BJJ only", () => {
  assert.deepEqual(
    buildFallbackRecurringClassProgrammeOptions(BAHAMAS_JIU_JITSU_CLUB_SLUG),
    [
      {
        programmeId: null,
        programmeType: "bjj",
        label: "BJJ",
      },
    ],
  );
});

test("buildFallbackRecurringClassProgrammeOptions keeps Kingston standard programmes", () => {
  const options = buildFallbackRecurringClassProgrammeOptions(KINGSTON_CLUB_SLUG);

  assert.deepEqual(
    options.map((option) => option.programmeType),
    ["bjj", "muay_thai", "strength_conditioning"],
  );
});

test("isRecurringClassProgrammeTypeAllowed rejects programmes outside academy scope", () => {
  const bahamasOptions = buildFallbackRecurringClassProgrammeOptions(
    BAHAMAS_JIU_JITSU_CLUB_SLUG,
  );

  assert.equal(isRecurringClassProgrammeTypeAllowed("bjj", bahamasOptions), true);
  assert.equal(
    isRecurringClassProgrammeTypeAllowed("muay_thai", bahamasOptions),
    false,
  );
});

test("ensureRecurringClassProgrammeOptionPresent keeps legacy edit values available", () => {
  const options = ensureRecurringClassProgrammeOptionPresent(
    buildFallbackRecurringClassProgrammeOptions(BAHAMAS_JIU_JITSU_CLUB_SLUG),
    "muay_thai",
  );

  assert.equal(options.length, 2);
  assert.equal(options[1]?.programmeType, "muay_thai");
});

test("resolveDefaultRecurringClassProgrammeType prefers an enabled schedule value", () => {
  const options = buildFallbackRecurringClassProgrammeOptions(KINGSTON_CLUB_SLUG);

  assert.equal(
    resolveDefaultRecurringClassProgrammeType(options, "muay_thai"),
    "muay_thai",
  );
  assert.equal(
    resolveDefaultRecurringClassProgrammeType(options, "custom"),
    "bjj",
  );
});
