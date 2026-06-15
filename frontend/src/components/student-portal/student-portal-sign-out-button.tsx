"use client";

import { useTransition } from "react";
import { signOutStudentPortalAction } from "@/app/student-portal/actions";
import { appendPortalSignOutRedirect } from "@/lib/pwa.shared";

export function StudentPortalSignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOutStudentPortalAction(appendPortalSignOutRedirect(new FormData()));
        });
      }}
      className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
