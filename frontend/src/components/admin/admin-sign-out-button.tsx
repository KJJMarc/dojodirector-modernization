"use client";

import { useTransition } from "react";
import { signOutAdminAccessAction } from "@/app/admin-access/[clubSlug]/actions";

interface AdminSignOutButtonProps {
  clubSlug: string;
}

export function AdminSignOutButton({ clubSlug }: AdminSignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOutAdminAccessAction(clubSlug);
        });
      }}
      className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:cursor-not-allowed disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
