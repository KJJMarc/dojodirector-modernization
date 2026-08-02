import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEditAdminStudentUserFields } from "./admin-edit-student.shared.ts";

describe("parseEditAdminStudentUserFields", () => {
  it("parses emergency contact name and phone as optional text", () => {
    const parsed = parseEditAdminStudentUserFields({
      userId: "4b255c94-5d6f-4312-95fe-2a344e0f5135",
      firstName: "Test",
      lastName: "Student",
      email: "test@example.com",
      phone: "07111 111111",
      emergencyContactName: " Jane Parent ",
      emergencyContactPhone: " 07999 999999 ",
      role: "student",
      membershipStatus: "active",
    });

    assert.equal(parsed.emergencyContactName, "Jane Parent");
    assert.equal(parsed.emergencyContactPhone, "07999 999999");
  });

  it("stores blank emergency contact fields as null", () => {
    const parsed = parseEditAdminStudentUserFields({
      userId: "4b255c94-5d6f-4312-95fe-2a344e0f5135",
      firstName: "Test",
      lastName: "Student",
      email: "",
      emergencyContactName: "  ",
      emergencyContactPhone: "",
      role: "student",
      membershipStatus: "active",
    });

    assert.equal(parsed.emergencyContactName, null);
    assert.equal(parsed.emergencyContactPhone, null);
  });
});
