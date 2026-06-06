import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatStudentPortalActionSuccessMessage,
  resolveStudentPortalActionClassName,
  toStudentPortalActionResult,
} from "@/lib/student-portal-action-result.shared";

test("resolveStudentPortalActionClassName returns className from action result", () => {
  assert.equal(
    resolveStudentPortalActionClassName({ className: "Kids Jiu Jitsu" }),
    "Kids Jiu Jitsu",
  );
});

test("resolveStudentPortalActionClassName falls back when result is missing", () => {
  assert.equal(resolveStudentPortalActionClassName(undefined), "this class");
  assert.equal(resolveStudentPortalActionClassName(null), "this class");
  assert.equal(resolveStudentPortalActionClassName({}), "this class");
  assert.equal(
    resolveStudentPortalActionClassName({ className: "   " }),
    "this class",
  );
});

test("formatStudentPortalActionSuccessMessage skips className lookup without placeholder", () => {
  assert.equal(
    formatStudentPortalActionSuccessMessage(
      "Booking accepted. Your place has been confirmed.",
      undefined,
    ),
    "Booking accepted. Your place has been confirmed.",
  );
});

test("formatStudentPortalActionSuccessMessage replaces placeholder safely", () => {
  assert.equal(
    formatStudentPortalActionSuccessMessage("You are booked for [class].", {
      className: "Adult BJJ",
    }),
    "You are booked for Adult BJJ.",
  );
  assert.equal(
    formatStudentPortalActionSuccessMessage("You are booked for [class].", undefined),
    "You are booked for this class.",
  );
});

test("toStudentPortalActionResult always returns a className string", () => {
  assert.deepEqual(toStudentPortalActionResult(undefined), {
    className: "this class",
  });
});
