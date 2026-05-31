"use client";

import { useTransition } from "react";
import { signOutInstructorPortalAction } from "@/app/instructor-portal/actions";

export function InstructorPortalSignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOutInstructorPortalAction();
        });
      }}
      className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:opacity-60"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
