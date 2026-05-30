"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAwardBeltLevel } from "@/lib/admin-change-belt.server";

function revalidateStudentBeltPaths(userId: string) {
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}/profile`);
  revalidatePath(`/admin/students/${userId}/change-belt`);
  revalidatePath(`/students/${userId}/attendance-card`);
}

export async function awardBeltLevelAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!userId) {
    throw new Error("Missing student id.");
  }

  if (!beltLevelId) {
    throw new Error("Please select a belt level.");
  }

  if (!awardedAt) {
    throw new Error("Please choose an awarded date.");
  }

  await adminAwardBeltLevel({
    userId,
    beltLevelId,
    awardedAt,
    notes,
  });

  revalidateStudentBeltPaths(userId);
  redirect(`/admin/students/${userId}/profile`);
}
