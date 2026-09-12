"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  inactivateMembershipPaymentMember,
  isMembershipPaymentsEnabledForClub,
  markMembershipPaymentPaid,
  pauseMembershipPaymentMember,
  reactivateMembershipPaymentMember,
  resumeMembershipPaymentMember,
  unmarkMembershipPayment,
  updateMembershipPaymentDate,
} from "@/lib/membership-payments.server";
import { clubMembershipPaymentsAdminPath } from "@/lib/membership-payments.shared";

async function requireMembershipPaymentsAccess(clubSlug: string) {
  const { club } = await requireAdminAccessForClubSlug(clubSlug);
  const enabled = await isMembershipPaymentsEnabledForClub(club.id);

  if (!enabled) {
    throw new Error("Membership payments are not enabled for this academy.");
  }

  return club;
}

function revalidateMembershipPayments(clubSlug: string) {
  revalidatePath(clubMembershipPaymentsAdminPath(clubSlug));
  revalidatePath(`/admin/${clubSlug}`);
}

export async function markMembershipPaidAction(input: {
  clubSlug: string;
  memberId: string;
  billingMonth: string;
  paidAt?: string | null;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await markMembershipPaymentPaid({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
    billingMonth: input.billingMonth,
    paidAt: input.paidAt,
  });

  revalidateMembershipPayments(club.slug);
}

export async function updateMembershipPaidAtAction(input: {
  clubSlug: string;
  memberId: string;
  billingMonth: string;
  paidAt: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await updateMembershipPaymentDate({
    academyId: club.id,
    memberId: input.memberId,
    billingMonth: input.billingMonth,
    paidAt: input.paidAt,
  });

  revalidateMembershipPayments(club.slug);
}

export async function unmarkMembershipPaidAction(input: {
  clubSlug: string;
  memberId: string;
  billingMonth: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await unmarkMembershipPayment({
    academyId: club.id,
    memberId: input.memberId,
    billingMonth: input.billingMonth,
  });

  revalidateMembershipPayments(club.slug);
}

export async function pauseMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await pauseMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPayments(club.slug);
}

export async function resumeMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await resumeMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPayments(club.slug);
}

export async function inactivateMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await inactivateMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPayments(club.slug);
}

export async function reactivateMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await reactivateMembershipPaymentMember({
    academyId: club.id,
    memberId: input.memberId,
  });

  revalidateMembershipPayments(club.slug);
}
