"use server";

import { revalidatePath } from "next/cache";
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

function revalidateClassManagementPaths(sessionId?: string) {
  revalidatePath("/admin/classes");
  revalidatePath("/admin/classes/new");
  revalidatePath("/admin/classes/new-event");
  revalidatePath("/book");
  revalidatePath("/attendance");

  if (sessionId) {
    revalidatePath(`/admin/classes/sessions/${sessionId}`);
    revalidatePath(`/admin/classes/sessions/${sessionId}/edit`);
    revalidatePath(`/attendance/${sessionId}`);
  }
}

export async function createRecurringClassAction(formData: FormData) {
  const input = parseCreateRecurringClassInput(formData);
  await createRecurringClassSchedule(input);
  revalidateClassManagementPaths();
}

export async function createOneOffEventAction(formData: FormData) {
  const input = parseCreateOneOffEventInput(formData);
  const sessionId = await createOneOffEvent(input);
  revalidateClassManagementPaths(sessionId);
}

export async function cancelClassSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await cancelClassSession(sessionId);
  revalidateClassManagementPaths(sessionId);
}

export async function reinstateClassSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing class session id.");
  }

  await reinstateClassSession(sessionId);
  revalidateClassManagementPaths(sessionId);
}

export async function updateClassSessionAction(formData: FormData) {
  const input = parseUpdateClassSessionInput(formData);
  await updateClassSession(input);
  revalidateClassManagementPaths(input.sessionId);
}
