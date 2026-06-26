"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { adminAwardBeltLevel } from "@/lib/admin-change-belt.server";

function revalidateStudentBeltPaths(userId: string) {
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}/profile`);
  revalidatePath(`/admin/students/${userId}/change-belt`);
  revalidatePath(`/students/${userId}/attendance-card`);
}

export type AwardBeltLevelActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function awardBeltLevelAction(
  formData: FormData,
): Promise<AwardBeltLevelActionResult> {
  const userId = String(formData.get("userId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  try {
    if (!userId) {
      return { ok: false, message: "Missing student id." };
    }

    if (!beltLevelId) {
      return { ok: false, message: "Please select a belt level." };
    }

    if (!awardedAt) {
      return { ok: false, message: "Please choose an awarded date." };
    }

    const result = await adminAwardBeltLevel({
      userId,
      beltLevelId,
      awardedAt,
      notes,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    revalidateStudentBeltPaths(userId);
    redirect(`/admin/students/${userId}/profile`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[awardBeltLevelAction] failed", {
      userId,
      beltLevelId,
      awardedAt,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to award belt level. Please try again.",
    };
  }

  return { ok: true };
}
