"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteLeadAction,
  restoreLeadAction,
} from "@/app/admin/[clubSlug]/leads/actions";
import {
  ADMIN_TABLE_ACTION_BUTTON_CLASS,
  ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS,
} from "@/components/admin/admin-table-row-action-styles";

interface ArchivedLeadRowActionsProps {
  clubSlug: string;
  leadId: string;
  leadName: string;
}

export function ArchivedLeadRowActions({
  clubSlug,
  leadId,
  leadName,
}: ArchivedLeadRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submitRestore = () => {
    const confirmed = window.confirm(
      `Restore ${leadName} to the active leads list?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await restoreLeadAction({ clubSlug, leadId });
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Unable to restore lead.",
        );
      }
    });
  };

  const submitDelete = () => {
    const confirmed = window.confirm(`Delete ${leadName} permanently?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteLeadAction({ clubSlug, leadId });
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Unable to delete lead.",
        );
      }
    });
  };

  return (
    <div className="inline-flex max-w-full flex-row flex-nowrap items-center gap-1">
      <button
        type="button"
        onClick={submitRestore}
        disabled={isPending}
        className={ADMIN_TABLE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Restore Lead"}
      </button>
      <button
        type="button"
        onClick={submitDelete}
        disabled={isPending}
        className={ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Delete Lead"}
      </button>
    </div>
  );
}
