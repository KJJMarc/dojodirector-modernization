import { clubAdminPath } from "@/lib/clubs.shared";

export const MEMBERSHIP_PAYMENT_STATUS_ACTIVE = "active";
export const MEMBERSHIP_PAYMENT_STATUS_PAUSED = "paused";
export const MEMBERSHIP_PAYMENT_STATUS_INACTIVE = "inactive";

export type MembershipPaymentStatus =
  | typeof MEMBERSHIP_PAYMENT_STATUS_ACTIVE
  | typeof MEMBERSHIP_PAYMENT_STATUS_PAUSED
  | typeof MEMBERSHIP_PAYMENT_STATUS_INACTIVE;

export type MembershipPaymentListFilter =
  | "all"
  | "active"
  | "paid"
  | "awaiting"
  | "paused"
  | "inactive";

export const MEMBERSHIP_PAYMENT_LIST_FILTERS: MembershipPaymentListFilter[] = [
  "all",
  "active",
  "paid",
  "awaiting",
  "paused",
  "inactive",
];

export const MEMBERSHIP_PAYMENT_STATUS_LABELS: Record<
  MembershipPaymentStatus,
  string
> = {
  active: "Active",
  paused: "Paused",
  inactive: "Inactive",
};

export interface MembershipPaymentProfileInput {
  status: MembershipPaymentStatus;
  pausedFrom: string | null;
  resumeDate: string | null;
  inactiveFrom: string | null;
}

export interface MembershipPaymentRecordView {
  id: string;
  billingMonth: string;
  paidAt: string;
}

export type MembershipMonthPaymentState =
  | "paid"
  | "awaiting"
  | "paused"
  | "inactive"
  | "future"
  | "not_applicable";

export interface MembershipPaymentMemberRow {
  memberId: string;
  fullName: string;
  email: string | null;
  status: MembershipPaymentStatus;
  pausedFrom: string | null;
  resumeDate: string | null;
  inactiveFrom: string | null;
  payment: MembershipPaymentRecordView | null;
  monthState: MembershipMonthPaymentState;
}

export interface MembershipPaymentMonthSummary {
  activeCount: number;
  paidThisMonth: number;
  awaitingPayment: number;
  pausedCount: number;
  inactiveCount: number;
}

export interface MembershipPaymentYearCell {
  billingMonth: string;
  state: MembershipMonthPaymentState;
}

export interface MembershipPaymentYearRow {
  memberId: string;
  fullName: string;
  status: MembershipPaymentStatus;
  cells: MembershipPaymentYearCell[];
}

/** Admin path for the manual membership payment ledger. */
export function clubMembershipPaymentsAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "membership-payments");
}

export function isMembershipPaymentStatus(
  value: string | null | undefined,
): value is MembershipPaymentStatus {
  return (
    value === MEMBERSHIP_PAYMENT_STATUS_ACTIVE ||
    value === MEMBERSHIP_PAYMENT_STATUS_PAUSED ||
    value === MEMBERSHIP_PAYMENT_STATUS_INACTIVE
  );
}

export function parseMembershipPaymentStatus(
  value: string | null | undefined,
): MembershipPaymentStatus {
  if (isMembershipPaymentStatus(value)) {
    return value;
  }

  return MEMBERSHIP_PAYMENT_STATUS_ACTIVE;
}

/** Normalize any date-like input to YYYY-MM-01 billing month key. */
export function toBillingMonthKey(input: string | Date): string {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid billing month date.");
    }

    const year = input.getUTCFullYear();
    const month = String(input.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }

  const trimmed = input.trim();
  const monthOnly = /^(\d{4})-(\d{2})$/.exec(trimmed);

  if (monthOnly) {
    return `${monthOnly[1]}-${monthOnly[2]}-01`;
  }

  const fullDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (fullDate) {
    return `${fullDate[1]}-${fullDate[2]}-01`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Billing month must use YYYY-MM or YYYY-MM-DD format.");
  }

  return toBillingMonthKey(parsed);
}

export function billingMonthLabel(billingMonth: string): string {
  const key = toBillingMonthKey(billingMonth);
  const [year, month] = key.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function shiftBillingMonth(billingMonth: string, deltaMonths: number): string {
  const key = toBillingMonthKey(billingMonth);
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const shifted = new Date(Date.UTC(year, monthIndex + deltaMonths, 1));

  return toBillingMonthKey(shifted);
}

export function compareBillingMonths(left: string, right: string): number {
  const a = toBillingMonthKey(left);
  const b = toBillingMonthKey(right);

  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

export function currentBillingMonthKey(
  now: Date = new Date(),
  timeZone = "UTC",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Unable to resolve current billing month.");
  }

  return `${year}-${month}-01`;
}

export function currentLocalDateIso(
  now: Date = new Date(),
  timeZone = "UTC",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to resolve local calendar date.");
  }

  return `${year}-${month}-${day}`;
}

export function defaultMembershipPaymentProfile(): MembershipPaymentProfileInput {
  return {
    status: MEMBERSHIP_PAYMENT_STATUS_ACTIVE,
    pausedFrom: null,
    resumeDate: null,
    inactiveFrom: null,
  };
}

/**
 * Whether a billing month should be treated as payable (can show as awaiting).
 * Paused spans and months on/after inactivation are not unpaid.
 */
export function isBillingMonthPayable(
  profile: MembershipPaymentProfileInput,
  billingMonth: string,
): boolean {
  const month = toBillingMonthKey(billingMonth);

  if (profile.inactiveFrom) {
    const inactiveMonth = toBillingMonthKey(profile.inactiveFrom);

    if (compareBillingMonths(month, inactiveMonth) >= 0) {
      return false;
    }
  } else if (profile.status === MEMBERSHIP_PAYMENT_STATUS_INACTIVE) {
    return false;
  }

  if (profile.pausedFrom) {
    const pauseStart = toBillingMonthKey(profile.pausedFrom);
    const pauseEndExclusive = profile.resumeDate
      ? toBillingMonthKey(profile.resumeDate)
      : null;

    if (compareBillingMonths(month, pauseStart) >= 0) {
      if (!pauseEndExclusive) {
        return false;
      }

      if (compareBillingMonths(month, pauseEndExclusive) < 0) {
        return false;
      }
    }
  } else if (profile.status === MEMBERSHIP_PAYMENT_STATUS_PAUSED) {
    return false;
  }

  return true;
}

export function resolveMembershipMonthPaymentState(input: {
  profile: MembershipPaymentProfileInput;
  billingMonth: string;
  paid: boolean;
  currentBillingMonth: string;
}): MembershipMonthPaymentState {
  const month = toBillingMonthKey(input.billingMonth);
  const current = toBillingMonthKey(input.currentBillingMonth);

  if (input.paid) {
    return "paid";
  }

  if (compareBillingMonths(month, current) > 0) {
    return "future";
  }

  if (!isBillingMonthPayable(input.profile, month)) {
    if (
      input.profile.inactiveFrom &&
      compareBillingMonths(month, toBillingMonthKey(input.profile.inactiveFrom)) >= 0
    ) {
      return "inactive";
    }

    if (
      input.profile.pausedFrom &&
      compareBillingMonths(month, toBillingMonthKey(input.profile.pausedFrom)) >= 0
    ) {
      const resume = input.profile.resumeDate
        ? toBillingMonthKey(input.profile.resumeDate)
        : null;

      if (!resume || compareBillingMonths(month, resume) < 0) {
        return "paused";
      }
    }

    if (input.profile.status === MEMBERSHIP_PAYMENT_STATUS_INACTIVE) {
      return "inactive";
    }

    if (input.profile.status === MEMBERSHIP_PAYMENT_STATUS_PAUSED) {
      return "paused";
    }

    return "not_applicable";
  }

  return "awaiting";
}

export function buildMembershipPaymentMonthSummary(
  rows: Array<Pick<MembershipPaymentMemberRow, "status" | "monthState">>,
): MembershipPaymentMonthSummary {
  let activeCount = 0;
  let paidThisMonth = 0;
  let awaitingPayment = 0;
  let pausedCount = 0;
  let inactiveCount = 0;

  for (const row of rows) {
    if (row.status === MEMBERSHIP_PAYMENT_STATUS_ACTIVE) {
      activeCount += 1;
    }

    if (row.status === MEMBERSHIP_PAYMENT_STATUS_PAUSED) {
      pausedCount += 1;
    }

    if (row.status === MEMBERSHIP_PAYMENT_STATUS_INACTIVE) {
      inactiveCount += 1;
    }

    if (row.monthState === "paid") {
      paidThisMonth += 1;
    }

    if (row.monthState === "awaiting") {
      awaitingPayment += 1;
    }
  }

  return {
    activeCount,
    paidThisMonth,
    awaitingPayment,
    pausedCount,
    inactiveCount,
  };
}

export function filterMembershipPaymentRows(
  rows: MembershipPaymentMemberRow[],
  filter: MembershipPaymentListFilter,
  searchQuery: string,
): MembershipPaymentMemberRow[] {
  const query = searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (query) {
      const haystack = `${row.fullName} ${row.email ?? ""}`.toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    switch (filter) {
      case "active":
        return row.status === MEMBERSHIP_PAYMENT_STATUS_ACTIVE;
      case "paid":
        return row.monthState === "paid";
      case "awaiting":
        return row.monthState === "awaiting";
      case "paused":
        return row.status === MEMBERSHIP_PAYMENT_STATUS_PAUSED;
      case "inactive":
        return row.status === MEMBERSHIP_PAYMENT_STATUS_INACTIVE;
      case "all":
      default:
        return true;
    }
  });
}

export function buildMembershipPaymentYearRows(input: {
  members: Array<{
    memberId: string;
    fullName: string;
    profile: MembershipPaymentProfileInput;
  }>;
  year: number;
  paymentsByMemberMonth: Map<string, Set<string>>;
  currentBillingMonth: string;
}): MembershipPaymentYearRow[] {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return `${input.year}-${month}-01`;
  });

  return input.members
    .map((member) => {
      const paidMonths = input.paymentsByMemberMonth.get(member.memberId) ?? new Set();

      return {
        memberId: member.memberId,
        fullName: member.fullName,
        status: member.profile.status,
        cells: months.map((billingMonth) => ({
          billingMonth,
          state: resolveMembershipMonthPaymentState({
            profile: member.profile,
            billingMonth,
            paid: paidMonths.has(toBillingMonthKey(billingMonth)),
            currentBillingMonth: input.currentBillingMonth,
          }),
        })),
      };
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export function parseIsoDateInput(value: string): string {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date is not a valid calendar day.");
  }

  return trimmed;
}
