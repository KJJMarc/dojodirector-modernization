"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  cancelClassSessionAction,
  reinstateClassSessionAction,
} from "@/app/admin/[clubSlug]/classes/actions";
import { clubAdminPath } from "@/lib/clubs.shared";

const SESSION_MANAGE_LINK_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50";

const SESSION_MANAGE_PRIMARY_LINK_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 text-xs font-semibold text-dojo-red transition hover:bg-dojo-red/20";

const SESSION_CANCEL_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated px-3 text-xs font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-60";

const SESSION_REINSTATE_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-green-700/50 bg-dojo-elevated px-3 text-xs font-semibold text-green-400 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60";

interface SessionManageActionsProps {
  clubSlug: string;
  sessionId: string;
  status: string | null;
}

export function SessionManageActions({
  clubSlug,
  sessionId,
  status,
}: SessionManageActionsProps) {
  const [isPending, startTransition] = useTransition();

  const submitSessionAction = (action: (formData: FormData) => Promise<void>) => {
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("sessionId", sessionId);

    startTransition(async () => {
      await action(formData);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={clubAdminPath(clubSlug, `classes/sessions/${sessionId}/edit`)}
        className={SESSION_MANAGE_LINK_CLASS}
      >
        Edit Session
      </Link>
      <Link href={`/attendance/${sessionId}`} className={SESSION_MANAGE_PRIMARY_LINK_CLASS}>
        Attendance Register
      </Link>
      {status === "scheduled" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitSessionAction(cancelClassSessionAction)}
          className={SESSION_CANCEL_BUTTON_CLASS}
        >
          {isPending ? "Working…" : "Cancel Session"}
        </button>
      ) : null}
      {status === "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitSessionAction(reinstateClassSessionAction)}
          className={SESSION_REINSTATE_BUTTON_CLASS}
        >
          {isPending ? "Working…" : "Reinstate Session"}
        </button>
      ) : null}
    </div>
  );
}

export const SESSION_MANAGE_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50";
