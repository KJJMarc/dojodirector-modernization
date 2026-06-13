"use server";

import { createOneOffEvent, parseCreateOneOffEventInput } from "@/lib/admin-one-off-events";
import { parseCreateRecurringClassInput } from "@/lib/admin-recurring-classes.input";
import {
  createRecurringClassSchedule,
} from "@/lib/admin-recurring-classes.server";
import {
  cancelClassSession,
  parseUpdateClassSessionInput,
  reinstateClassSession,
  updateClassSession,
} from "@/lib/admin-class-sessions";
import { revalidateClassManagementPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function createRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input = parseCreateRecurringClassInput(formData);
  await createRecurringClassSchedule(input, club.id, club.slug);
  revalidateClassManagementPaths(clubSlug);
}

export async function createOneOffEventAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input = parseCreateOneOffEventInput(formData);
  const sessionId = await createOneOffEvent(input, club.id, club.slug);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function cancelClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await cancelClassSession(sessionId, club.id);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function reinstateClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await reinstateClassSession(sessionId, club.id);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function updateClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input = parseUpdateClassSessionInput(formData);
  await updateClassSession(input, club.id);
  revalidateClassManagementPaths(clubSlug, input.sessionId);
}
