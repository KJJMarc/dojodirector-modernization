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

export async function createRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const input = parseCreateRecurringClassInput(formData);
  await createRecurringClassSchedule(input);
  revalidateClassManagementPaths(clubSlug);
}

export async function createOneOffEventAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const input = parseCreateOneOffEventInput(formData);
  const sessionId = await createOneOffEvent(input);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function cancelClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await cancelClassSession(sessionId);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function reinstateClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await reinstateClassSession(sessionId);
  revalidateClassManagementPaths(clubSlug, sessionId);
}

export async function updateClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const input = parseUpdateClassSessionInput(formData);
  await updateClassSession(input);
  revalidateClassManagementPaths(clubSlug, input.sessionId);
}
