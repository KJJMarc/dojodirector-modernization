"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { adminUpdateMembershipStatus } from "@/lib/admin-student-membership.server";
import { clubAdminPath } from "@/lib/clubs.shared";
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

function revalidateMembershipPayments(clubSlug: string, memberId?: string) {
  revalidatePath(clubMembershipPaymentsAdminPath(clubSlug));

  if (memberId) {
    revalidatePath(clubAdminPath(clubSlug, `students/${memberId}/profile`));
  }
}

function revalidateMembershipPaymentsBroad(clubSlug: string, memberId: string) {
  revalidateMembershipPayments(clubSlug, memberId);
  revalidatePath(`/admin/${clubSlug}`);
  revalidatePath(clubAdminPath(clubSlug, `students/${memberId}/edit`));
  revalidatePath(clubAdminPath(clubSlug, "students"));
}

async function syncClubMembershipStatus(input: {
  clubId: string;
  memberId: string;
  status: "active" | "paused" | "inactive";
}) {
  await adminUpdateMembershipStatus({
    userId: input.memberId,
    clubId: input.clubId,
    status: input.status,
  });
}

export async function markMembershipPaidAction(input: {
  clubSlug: string;
  memberId: string;
  billingMonth: string;
  paidAt: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await markMembershipPaymentPaid({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
    billingMonth: input.billingMonth,
    paidAt: input.paidAt,
  });

  revalidateMembershipPayments(club.slug, input.memberId);
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

  revalidateMembershipPayments(club.slug, input.memberId);
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

  revalidateMembershipPayments(club.slug, input.memberId);
}

export async function pauseMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await syncClubMembershipStatus({
    clubId: club.id,
    memberId: input.memberId,
    status: "paused",
  });

  await pauseMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPaymentsBroad(club.slug, input.memberId);
}

export async function resumeMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await syncClubMembershipStatus({
    clubId: club.id,
    memberId: input.memberId,
    status: "active",
  });

  await resumeMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPaymentsBroad(club.slug, input.memberId);
}

export async function inactivateMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await syncClubMembershipStatus({
    clubId: club.id,
    memberId: input.memberId,
    status: "inactive",
  });

  await inactivateMembershipPaymentMember({
    academyId: club.id,
    clubSlug: club.slug,
    memberId: input.memberId,
  });

  revalidateMembershipPaymentsBroad(club.slug, input.memberId);
}

export async function reactivateMembershipPaymentAction(input: {
  clubSlug: string;
  memberId: string;
}) {
  const club = await requireMembershipPaymentsAccess(input.clubSlug);

  await syncClubMembershipStatus({
    clubId: club.id,
    memberId: input.memberId,
    status: "active",
  });

  await reactivateMembershipPaymentMember({
    academyId: club.id,
    memberId: input.memberId,
  });

  revalidateMembershipPaymentsBroad(club.slug, input.memberId);
}
