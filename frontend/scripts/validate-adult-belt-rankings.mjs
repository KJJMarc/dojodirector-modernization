/**
 * Validates adult belt rankings grouping/sorting helpers.
 *
 * Usage:
 *   node scripts/validate-adult-belt-rankings.mjs
 */

import assert from "node:assert/strict";

function getMajorAdultBeltColor(beltName, beltType) {
  const normalizedName = beltName.trim().toLowerCase();
  const normalizedType = beltType?.trim().toLowerCase() ?? "";

  if (normalizedName.includes("black") || normalizedType === "degree") {
    return "black";
  }
  if (normalizedName.includes("brown")) return "brown";
  if (normalizedName.includes("purple")) return "purple";
  if (normalizedName.includes("blue")) return "blue";
  if (normalizedName.includes("white")) return "white";
  return null;
}

function getBeltStripeCount(belt) {
  if (typeof belt.stripe_count === "number" && belt.stripe_count >= 0) {
    return belt.stripe_count;
  }
  const stripeMatch = belt.name.match(/(\d+)\s*stripe/i);
  return stripeMatch ? Number.parseInt(stripeMatch[1] ?? "0", 10) : 0;
}

function shouldIncludeRankedStudent(majorColor, stripeCount) {
  if (majorColor === "white") {
    return stripeCount >= 1;
  }
  return true;
}

function getBlackBeltDegreeSortKey(beltName, beltType) {
  const normalizedName = beltName.trim().toLowerCase();
  const degreeMatch = normalizedName.match(
    /(\d+)(?:st|nd|rd|th)\s*degree|degree\s*(\d+)/i,
  );

  if (degreeMatch) {
    return Number.parseInt(degreeMatch[1] ?? degreeMatch[2] ?? "0", 10);
  }

  if (beltType?.trim().toLowerCase() === "degree") {
    const numberMatch = normalizedName.match(/\d+/);
    return numberMatch ? Number.parseInt(numberMatch[0], 10) : 0;
  }

  return 0;
}

function compareStudentsBySurnameFirstName(left, right) {
  const lastNameCompare = (left.lastName ?? "").localeCompare(
    right.lastName ?? "",
    "en",
    { sensitivity: "base" },
  );

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return (left.firstName ?? "").localeCompare(right.firstName ?? "", "en", {
    sensitivity: "base",
  });
}

assert.equal(getMajorAdultBeltColor("Black Belt 3rd Degree", "degree"), "black");
assert.equal(getMajorAdultBeltColor("Blue Belt, 2 Stripes", null), "blue");
assert.equal(getBeltStripeCount({ name: "Brown Belt, 4 Stripes", stripe_count: 4 }), 4);
assert.equal(
  getBeltStripeCount({ name: "White Belt", stripe_count: 0, belt_category: "adult" }),
  0,
);
assert.equal(shouldIncludeRankedStudent("white", 0), false);
assert.equal(shouldIncludeRankedStudent("white", 1), true);
assert.equal(shouldIncludeRankedStudent("white", 2), true);
assert.equal(shouldIncludeRankedStudent("blue", 0), true);

assert.equal(getBlackBeltDegreeSortKey("Black Belt 6th Degree", "degree"), 6);
assert.equal(getBlackBeltDegreeSortKey("Black Belt", null), 0);

const sortedStudents = [
  { lastName: "Smith", firstName: "Anna" },
  { lastName: "Smith", firstName: "Ben" },
  { lastName: "Taylor", firstName: "Chris" },
]
  .sort(compareStudentsBySurnameFirstName)
  .map((student) => `${student.lastName}, ${student.firstName}`);

assert.deepEqual(sortedStudents, [
  "Smith, Anna",
  "Smith, Ben",
  "Taylor, Chris",
]);

const stripeOrder = [
  { name: "Blue Belt", stripe_count: 0 },
  { name: "Blue Belt, 1 Stripe", stripe_count: 1 },
  { name: "Blue Belt, 4 Stripes", stripe_count: 4 },
]
  .map((belt) => ({
    label: belt.name,
    stripeCount: getBeltStripeCount(belt),
  }))
  .sort((left, right) => right.stripeCount - left.stripeCount)
  .map((belt) => belt.label);

assert.deepEqual(stripeOrder, [
  "Blue Belt, 4 Stripes",
  "Blue Belt, 1 Stripe",
  "Blue Belt",
]);

console.log("validate-adult-belt-rankings: all checks passed");
