import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
} from "@/lib/admin-club-memberships.server";
import { getClubIanaTimeZone } from "@/lib/clubs.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildMembershipPaymentMonthSummary,
  buildMembershipPaymentYearRows,
  currentBillingMonthKey,
  currentLocalDateIso,
  defaultMembershipPaymentProfile,
  isMembershipPaymentStatus,
  MEMBERSHIP_PAYMENT_STATUS_ACTIVE,
  MEMBERSHIP_PAYMENT_STATUS_INACTIVE,
  MEMBERSHIP_PAYMENT_STATUS_PAUSED,
  parseIsoDateInput,
  resolveMembershipMonthPaymentState,
  toBillingMonthKey,
  type MembershipPaymentMemberRow,
  type MembershipPaymentMonthSummary,
  type MembershipPaymentProfileInput,
  type MembershipPaymentStatus,
  type MembershipPaymentYearRow,
} from "@/lib/membership-payments.shared";

export const MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE =
  "Membership payments are not set up yet. Please run the database migration.";

interface ClubFeatureFlagRow {
  membership_payments_enabled: boolean | null;
}

interface PaymentProfileRow {
  academy_id: string;
  member_id: string;
  status: string;
  paused_from: string | null;
  resume_date: string | null;
  inactive_from: string | null;
}

interface PaymentRow {
  id: string;
  academy_id: string;
  member_id: string;
  billing_month: string;
  paid_at: string;
}

function isMissingMembershipPaymentsSchemaError(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("membership_payments") ||
    message.includes("membership_payment_profiles") ||
    message.includes("membership_payments_enabled")
  );
}

export async function isMembershipPaymentsEnabledForClub(
  clubId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("membership_payments_enabled")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      return false;
    }

    throw new Error(`Failed to load membership payments flag: ${error.message}`);
  }

  return Boolean((data as ClubFeatureFlagRow | null)?.membership_payments_enabled);
}

function mapProfileRow(row: PaymentProfileRow | null | undefined): MembershipPaymentProfileInput {
  if (!row) {
    return defaultMembershipPaymentProfile();
  }

  return {
    status: isMembershipPaymentStatus(row.status)
      ? row.status
      : MEMBERSHIP_PAYMENT_STATUS_ACTIVE,
    pausedFrom: row.paused_from,
    resumeDate: row.resume_date,
    inactiveFrom: row.inactive_from,
  };
}

async function loadPaymentProfilesByMemberId(
  academyId: string,
): Promise<Map<string, MembershipPaymentProfileInput>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("membership_payment_profiles")
    .select("academy_id, member_id, status, paused_from, resume_date, inactive_from")
    .eq("academy_id", academyId);

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Failed to load membership payment profiles: ${error.message}`);
  }

  const map = new Map<string, MembershipPaymentProfileInput>();

  for (const row of (data ?? []) as PaymentProfileRow[]) {
    map.set(row.member_id, mapProfileRow(row));
  }

  return map;
}

async function loadPaymentsForBillingMonth(
  academyId: string,
  billingMonth: string,
): Promise<Map<string, PaymentRow>> {
  const month = toBillingMonthKey(billingMonth);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("membership_payments")
    .select("id, academy_id, member_id, billing_month, paid_at")
    .eq("academy_id", academyId)
    .eq("billing_month", month);

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Failed to load membership payments: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as PaymentRow[]).map((row) => [row.member_id, row]),
  );
}

async function loadPaymentsForYear(
  academyId: string,
  year: number,
): Promise<PaymentRow[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-01`;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("membership_payments")
    .select("id, academy_id, member_id, billing_month, paid_at")
    .eq("academy_id", academyId)
    .gte("billing_month", start)
    .lte("billing_month", end);

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Failed to load membership payments for year: ${error.message}`);
  }

  return (data ?? []) as PaymentRow[];
}

/** Student members of the academy (existing memberships table — no second directory). */
async function loadAcademyStudentMemberIds(academyId: string): Promise<string[]> {
  const memberships = await loadClubMembershipRows(academyId);
  const studentIds = memberships
    .filter((membership) => (membership.role ?? "").trim().toLowerCase() === "student")
    .map((membership) => membership.user_id);

  return Array.from(new Set(studentIds));
}

export interface MembershipPaymentsWorkspace {
  billingMonth: string;
  currentBillingMonth: string;
  summary: MembershipPaymentMonthSummary;
  rows: MembershipPaymentMemberRow[];
  year: number;
  yearRows: MembershipPaymentYearRow[];
}

export async function loadMembershipPaymentsWorkspace(input: {
  academyId: string;
  clubSlug: string;
  billingMonth?: string | null;
  year?: number | null;
}): Promise<MembershipPaymentsWorkspace> {
  const timeZone = getClubIanaTimeZone(input.clubSlug);
  const currentBillingMonth = currentBillingMonthKey(new Date(), timeZone);
  const billingMonth = toBillingMonthKey(input.billingMonth ?? currentBillingMonth);
  const year =
    input.year && Number.isFinite(input.year)
      ? Math.trunc(input.year)
      : Number(billingMonth.slice(0, 4));

  const memberIds = await loadAcademyStudentMemberIds(input.academyId);
  const [profilesByMemberId, paymentsByMemberId, yearPayments, profiles] =
    await Promise.all([
      loadPaymentProfilesByMemberId(input.academyId),
      loadPaymentsForBillingMonth(input.academyId, billingMonth),
      loadPaymentsForYear(input.academyId, year),
      loadAdminStudentProfileRowsByIds(memberIds),
    ]);

  const rows: MembershipPaymentMemberRow[] = [];

  for (const memberId of memberIds) {
    const user = profiles.get(memberId);

    if (!user) {
      continue;
    }

    const profile = profilesByMemberId.get(memberId) ?? defaultMembershipPaymentProfile();
    const payment = paymentsByMemberId.get(memberId) ?? null;
    const monthState = resolveMembershipMonthPaymentState({
      profile,
      billingMonth,
      paid: Boolean(payment),
      currentBillingMonth,
    });

    rows.push({
      memberId,
      fullName: getStudentFullName(user.first_name, user.last_name),
      email: user.email,
      status: profile.status,
      pausedFrom: profile.pausedFrom,
      resumeDate: profile.resumeDate,
      inactiveFrom: profile.inactiveFrom,
      payment: payment
        ? {
            id: payment.id,
            billingMonth: toBillingMonthKey(payment.billing_month),
            paidAt: payment.paid_at,
          }
        : null,
      monthState,
    });
  }

  rows.sort((left, right) => left.fullName.localeCompare(right.fullName));

  const paymentsByMemberMonth = new Map<string, Set<string>>();

  for (const payment of yearPayments) {
    const set = paymentsByMemberMonth.get(payment.member_id) ?? new Set<string>();
    set.add(toBillingMonthKey(payment.billing_month));
    paymentsByMemberMonth.set(payment.member_id, set);
  }

  const yearRows = buildMembershipPaymentYearRows({
    members: rows.map((row) => ({
      memberId: row.memberId,
      fullName: row.fullName,
      profile: {
        status: row.status,
        pausedFrom: row.pausedFrom,
        resumeDate: row.resumeDate,
        inactiveFrom: row.inactiveFrom,
      },
    })),
    year,
    paymentsByMemberMonth,
    currentBillingMonth,
  });

  return {
    billingMonth,
    currentBillingMonth,
    summary: buildMembershipPaymentMonthSummary(rows),
    rows,
    year,
    yearRows,
  };
}

async function assertMemberBelongsToAcademy(
  academyId: string,
  memberId: string,
): Promise<void> {
  const memberIds = await loadAcademyStudentMemberIds(academyId);

  if (!memberIds.includes(memberId)) {
    throw new Error("Member not found for this academy.");
  }
}

export async function markMembershipPaymentPaid(input: {
  academyId: string;
  clubSlug: string;
  memberId: string;
  billingMonth: string;
  paidAt?: string | null;
}): Promise<void> {
  await assertMemberBelongsToAcademy(input.academyId, input.memberId);

  const billingMonth = toBillingMonthKey(input.billingMonth);
  const timeZone = getClubIanaTimeZone(input.clubSlug);
  const paidAt = input.paidAt?.trim()
    ? parseIsoDateInput(input.paidAt)
    : currentLocalDateIso(new Date(), timeZone);
  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("membership_payments").upsert(
    {
      academy_id: input.academyId,
      member_id: input.memberId,
      billing_month: billingMonth,
      paid_at: paidAt,
      updated_at: now,
    },
    { onConflict: "academy_id,member_id,billing_month" },
  );

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Unable to mark payment as paid: ${error.message}`);
  }
}

export async function updateMembershipPaymentDate(input: {
  academyId: string;
  memberId: string;
  billingMonth: string;
  paidAt: string;
}): Promise<void> {
  await assertMemberBelongsToAcademy(input.academyId, input.memberId);

  const billingMonth = toBillingMonthKey(input.billingMonth);
  const paidAt = parseIsoDateInput(input.paidAt);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("membership_payments")
    .update({
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("academy_id", input.academyId)
    .eq("member_id", input.memberId)
    .eq("billing_month", billingMonth);

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Unable to update payment date: ${error.message}`);
  }
}

export async function unmarkMembershipPayment(input: {
  academyId: string;
  memberId: string;
  billingMonth: string;
}): Promise<void> {
  await assertMemberBelongsToAcademy(input.academyId, input.memberId);

  const billingMonth = toBillingMonthKey(input.billingMonth);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("membership_payments")
    .delete()
    .eq("academy_id", input.academyId)
    .eq("member_id", input.memberId)
    .eq("billing_month", billingMonth);

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Unable to remove payment: ${error.message}`);
  }
}

async function upsertPaymentProfile(input: {
  academyId: string;
  memberId: string;
  status: MembershipPaymentStatus;
  pausedFrom: string | null;
  resumeDate: string | null;
  inactiveFrom: string | null;
}): Promise<void> {
  await assertMemberBelongsToAcademy(input.academyId, input.memberId);

  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("membership_payment_profiles").upsert(
    {
      academy_id: input.academyId,
      member_id: input.memberId,
      status: input.status,
      paused_from: input.pausedFrom,
      resume_date: input.resumeDate,
      inactive_from: input.inactiveFrom,
      updated_at: now,
    },
    { onConflict: "academy_id,member_id" },
  );

  if (error) {
    if (isMissingMembershipPaymentsSchemaError(error)) {
      throw new Error(MEMBERSHIP_PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Unable to update membership payment status: ${error.message}`);
  }
}

export async function pauseMembershipPaymentMember(input: {
  academyId: string;
  clubSlug: string;
  memberId: string;
  pausedFrom?: string | null;
}): Promise<void> {
  const timeZone = getClubIanaTimeZone(input.clubSlug);
  const pausedFrom = input.pausedFrom?.trim()
    ? parseIsoDateInput(input.pausedFrom)
    : currentLocalDateIso(new Date(), timeZone);

  await upsertPaymentProfile({
    academyId: input.academyId,
    memberId: input.memberId,
    status: MEMBERSHIP_PAYMENT_STATUS_PAUSED,
    pausedFrom,
    resumeDate: null,
    inactiveFrom: null,
  });
}

export async function resumeMembershipPaymentMember(input: {
  academyId: string;
  clubSlug: string;
  memberId: string;
  resumeDate?: string | null;
}): Promise<void> {
  const timeZone = getClubIanaTimeZone(input.clubSlug);
  const resumeDate = input.resumeDate?.trim()
    ? parseIsoDateInput(input.resumeDate)
    : currentLocalDateIso(new Date(), timeZone);

  const profiles = await loadPaymentProfilesByMemberId(input.academyId);
  const existing = profiles.get(input.memberId) ?? defaultMembershipPaymentProfile();

  await upsertPaymentProfile({
    academyId: input.academyId,
    memberId: input.memberId,
    status: MEMBERSHIP_PAYMENT_STATUS_ACTIVE,
    pausedFrom: existing.pausedFrom,
    resumeDate,
    inactiveFrom: null,
  });
}

export async function inactivateMembershipPaymentMember(input: {
  academyId: string;
  clubSlug: string;
  memberId: string;
  inactiveFrom?: string | null;
}): Promise<void> {
  const timeZone = getClubIanaTimeZone(input.clubSlug);
  const inactiveFrom = input.inactiveFrom?.trim()
    ? parseIsoDateInput(input.inactiveFrom)
    : currentLocalDateIso(new Date(), timeZone);

  const profiles = await loadPaymentProfilesByMemberId(input.academyId);
  const existing = profiles.get(input.memberId) ?? defaultMembershipPaymentProfile();

  await upsertPaymentProfile({
    academyId: input.academyId,
    memberId: input.memberId,
    status: MEMBERSHIP_PAYMENT_STATUS_INACTIVE,
    pausedFrom: existing.pausedFrom,
    resumeDate: existing.resumeDate,
    inactiveFrom,
  });
}

export async function reactivateMembershipPaymentMember(input: {
  academyId: string;
  memberId: string;
}): Promise<void> {
  const profiles = await loadPaymentProfilesByMemberId(input.academyId);
  const existing = profiles.get(input.memberId) ?? defaultMembershipPaymentProfile();

  await upsertPaymentProfile({
    academyId: input.academyId,
    memberId: input.memberId,
    status: MEMBERSHIP_PAYMENT_STATUS_ACTIVE,
    pausedFrom: existing.pausedFrom,
    resumeDate: existing.resumeDate,
    inactiveFrom: null,
  });
}
