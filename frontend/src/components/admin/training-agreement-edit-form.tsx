"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveTrainingAgreementTemplateAction } from "@/app/admin/[clubSlug]/training-agreements/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import type { ClubAgreementTemplateEditState } from "@/lib/club-agreement-templates.server";

interface TrainingAgreementEditFormProps {
  clubSlug: string;
  state: ClubAgreementTemplateEditState;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

const agreementBodyClassName =
  "w-full min-h-[28rem] resize-y rounded-lg border border-neutral-500 bg-white px-6 py-6 font-sans text-sm leading-7 text-black shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-700 focus:ring-2 focus:ring-neutral-500/30";

export function TrainingAgreementEditForm({
  clubSlug,
  state,
}: TrainingAgreementEditFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await saveTrainingAgreementTemplateAction(formData);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to save agreement template.",
            );
          }
        });
      }}
    >
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="agreementType" value={state.agreementType} />
      {state.templateId ? (
        <input type="hidden" name="templateId" value={state.templateId} />
      ) : null}

      <p className="text-sm text-dojo-muted">
        Bump the version (for example 1.0 to 1.1) when wording changes materially so
        members and guests accept the new text. Signed PDFs already stored are not
        changed.
      </p>

      <div className="space-y-2">
        <label htmlFor="agreement-title" className={labelClassName}>
          Agreement title
        </label>
        <input
          id="agreement-title"
          name="title"
          type="text"
          required
          defaultValue={state.title}
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="agreement-version" className={labelClassName}>
          Version
        </label>
        <input
          id="agreement-version"
          name="version"
          type="text"
          required
          defaultValue={state.version}
          placeholder="1.0"
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="agreement-body" className={labelClassName}>
          Agreement body text
        </label>
        <textarea
          id="agreement-body"
          name="body"
          required
          rows={24}
          defaultValue={state.body}
          className={agreementBodyClassName}
          spellCheck
        />
        <p className="text-xs text-dojo-muted">
          Separate sections with a line containing only{" "}
          <code className="text-dojo-white">---</code>. Use{" "}
          <code className="text-dojo-white">## Section title</code> for titled sections.
        </p>
      </div>

      <label className="flex items-center gap-3">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={state.isActive}
          className="h-4 w-4 rounded border-dojo-border"
        />
        <span className="text-sm text-dojo-white">Active</span>
      </label>

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <Link
          href={clubAdminPath(clubSlug, "training-agreements")}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-dojo-border px-6 py-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
