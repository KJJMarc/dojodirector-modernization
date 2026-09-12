import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addOneCalendarMonth,
  billingMonthLabel,
  buildMembershipPaymentMonthSummary,
  buildMembershipPaymentYearRows,
  compareBillingMonths,
  currentBillingMonthKey,
  filterMembershipPaymentRows,
  isBillingMonthPayable,
  resolveMembershipMonthPaymentState,
  shiftBillingMonth,
  toBillingMonthKey,
  type MembershipPaymentMemberRow,
  type MembershipPaymentProfileInput,
} from "@/lib/membership-payments.shared";

function profile(
  overrides: Partial<MembershipPaymentProfileInput> = {},
): MembershipPaymentProfileInput {
  return {
    status: "active",
    nextDueDate: null,
    pausedFrom: null,
    resumeDate: null,
    inactiveFrom: null,
    ...overrides,
  };
}

function row(
  overrides: Partial<MembershipPaymentMemberRow> &
    Pick<MembershipPaymentMemberRow, "memberId" | "fullName">,
): MembershipPaymentMemberRow {
  return {
    email: null,
    status: "active",
    dueDate: null,
    pausedFrom: null,
    resumeDate: null,
    inactiveFrom: null,
    payment: null,
    monthState: "awaiting",
    ...overrides,
  };
}

describe("membership payments shared", () => {
  it("normalizes billing month keys", () => {
    assert.equal(toBillingMonthKey("2026-09"), "2026-09-01");
    assert.equal(toBillingMonthKey("2026-09-15"), "2026-09-01");
    assert.equal(shiftBillingMonth("2026-01-01", -1), "2025-12-01");
    assert.equal(billingMonthLabel("2026-09-01"), "September 2026");
    assert.equal(compareBillingMonths("2026-08", "2026-09-01"), -1);
  });

  it("sets next due as paid date plus one calendar month", () => {
    assert.equal(addOneCalendarMonth("2026-09-12"), "2026-10-12");
    assert.equal(addOneCalendarMonth("2026-01-31"), "2026-02-28");
    assert.equal(addOneCalendarMonth("2026-12-15"), "2027-01-15");
  });

  it("marks unpaid past next due date as overdue", () => {
    assert.equal(
      resolveMembershipMonthPaymentState({
        profile: profile({ nextDueDate: "2026-09-10" }),
        billingMonth: "2026-09-01",
        paid: false,
        currentBillingMonth: "2026-09-01",
        todayIso: "2026-09-12",
      }),
      "overdue",
    );

    assert.equal(
      resolveMembershipMonthPaymentState({
        profile: profile({ nextDueDate: "2026-09-20" }),
        billingMonth: "2026-09-01",
        paid: false,
        currentBillingMonth: "2026-09-01",
        todayIso: "2026-09-12",
      }),
      "awaiting",
    );
  });

  it("does not treat paused or inactive months as unpaid", () => {
    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "paused",
          pausedFrom: "2026-03-01",
        }),
        "2026-04-01",
      ),
      false,
    );

    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "active",
          pausedFrom: "2026-03-10",
          resumeDate: "2026-05-01",
        }),
        "2026-04-01",
      ),
      false,
    );

    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "active",
          pausedFrom: "2026-03-10",
          resumeDate: "2026-05-01",
        }),
        "2026-05-01",
      ),
      true,
    );

    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "inactive",
          inactiveFrom: "2026-06-15",
        }),
        "2026-07-01",
      ),
      false,
    );
  });

  it("keeps months before pause or inactivation payable", () => {
    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "paused",
          pausedFrom: "2026-04-01",
        }),
        "2026-03-01",
      ),
      true,
    );

    assert.equal(
      isBillingMonthPayable(
        profile({
          status: "inactive",
          inactiveFrom: "2026-06-15",
        }),
        "2026-05-01",
      ),
      true,
    );
  });

  it("marks future months as future rather than overdue", () => {
    assert.equal(
      resolveMembershipMonthPaymentState({
        profile: profile(),
        billingMonth: "2026-12-01",
        paid: false,
        currentBillingMonth: "2026-09-01",
        todayIso: "2026-09-12",
      }),
      "future",
    );

    assert.equal(
      resolveMembershipMonthPaymentState({
        profile: profile(),
        billingMonth: "2026-08-01",
        paid: false,
        currentBillingMonth: "2026-09-01",
        todayIso: "2026-09-12",
      }),
      "awaiting",
    );

    assert.equal(
      resolveMembershipMonthPaymentState({
        profile: profile({
          status: "paused",
          pausedFrom: "2026-07-01",
        }),
        billingMonth: "2026-08-01",
        paid: false,
        currentBillingMonth: "2026-09-01",
        todayIso: "2026-09-12",
      }),
      "paused",
    );
  });

  it("builds month summary and filters", () => {
    const rows = [
      row({
        memberId: "1",
        fullName: "Alex Active",
        status: "active",
        monthState: "paid",
        payment: { id: "p1", billingMonth: "2026-09-01", paidAt: "2026-09-02" },
      }),
      row({
        memberId: "2",
        fullName: "Blake Awaiting",
        status: "active",
        monthState: "awaiting",
      }),
      row({
        memberId: "3",
        fullName: "Casey Paused",
        status: "paused",
        monthState: "paused",
      }),
      row({
        memberId: "4",
        fullName: "Dana Inactive",
        status: "inactive",
        monthState: "inactive",
      }),
      row({
        memberId: "5",
        fullName: "Eve Overdue",
        status: "active",
        monthState: "overdue",
        dueDate: "2026-09-05",
      }),
    ];

    assert.deepEqual(buildMembershipPaymentMonthSummary(rows), {
      activeCount: 3,
      paidThisMonth: 1,
      awaitingPayment: 2,
      overdueCount: 1,
      pausedCount: 1,
      inactiveCount: 1,
    });

    assert.equal(filterMembershipPaymentRows(rows, "awaiting", "").length, 2);
    assert.equal(filterMembershipPaymentRows(rows, "overdue", "").length, 1);
    assert.equal(filterMembershipPaymentRows(rows, "all", "blake").length, 1);
  });

  it("builds year view cells with paid ticks and non-overdue futures", () => {
    const yearRows = buildMembershipPaymentYearRows({
      members: [
        {
          memberId: "1",
          fullName: "Alex",
          profile: profile(),
        },
      ],
      year: 2026,
      paymentsByMemberMonth: new Map([["1", new Set(["2026-01-01", "2026-02-01"])]]),
      currentBillingMonth: "2026-03-01",
      todayIso: "2026-03-12",
    });

    assert.equal(yearRows[0]?.cells[0]?.state, "paid");
    assert.equal(yearRows[0]?.cells[1]?.state, "paid");
    assert.equal(yearRows[0]?.cells[2]?.state, "awaiting");
    assert.equal(yearRows[0]?.cells[3]?.state, "future");
  });

  it("resolves current billing month in academy timezone", () => {
    const now = new Date("2026-09-12T03:00:00.000Z");
    assert.equal(currentBillingMonthKey(now, "America/Nassau"), "2026-09-01");
  });
});
