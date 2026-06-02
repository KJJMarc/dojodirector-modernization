"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchInstructorPortalClubAction } from "@/app/instructor-portal/actions";

export function InstructorPortalSwitchAcademyButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await switchInstructorPortalClubAction();
          router.refresh();
        });
      }}
      className="rounded-lg border border-dojo-border px-3 py-1.5 text-sm text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      Switch academy
    </button>
  );
}
