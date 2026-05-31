"use client";

import { useTransition } from "react";
import { signOutStudentPortalAction } from "@/app/student-portal/actions";

export function StudentPortalSignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOutStudentPortalAction();
        });
      }}
      className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
