"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  archiveLeadAction,
  deleteLeadAction,
} from "@/app/admin/[clubSlug]/leads/actions";
import {
  ADMIN_TABLE_ACTION_BUTTON_CLASS,
  ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS,
} from "@/components/admin/admin-table-row-action-styles";

interface LeadRowActionsProps {
  clubSlug: string;
  leadId: string;
  leadName: string;
}

export function LeadRowActions({ clubSlug, leadId, leadName }: LeadRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submitArchive = () => {
    const confirmed = window.confirm(
      `Archive ${leadName}?\n\nThey will be hidden from active lead pipelines but their history is preserved.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await archiveLeadAction({ clubSlug, leadId });
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Unable to archive lead.",
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
        onClick={submitArchive}
        disabled={isPending}
        className={ADMIN_TABLE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Archive Lead"}
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
