"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  resetLeadWorkflowAction,
  saveLeadWorkflowAction,
} from "@/app/admin/[clubSlug]/leads/actions";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/leads.shared";
import type { AcademyLeadWorkflowInput } from "@/lib/lead-workflow.shared";
import {
  WORKFLOW_APPLIES_TO_STATUS_OPTIONS,
} from "@/lib/lead-workflow.shared";

interface LeadWorkflowSettingsClientProps {
  clubSlug: string;
  initialWorkflow: AcademyLeadWorkflowInput;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function LeadWorkflowSettingsClient({
  clubSlug,
  initialWorkflow,
}: LeadWorkflowSettingsClientProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStage = (
    index: number,
    patch: Partial<AcademyLeadWorkflowInput["stages"][number]>,
  ) => {
    setWorkflow((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, ...patch } : stage,
      ),
    }));
  };

  const toggleStageStatus = (index: number, status: LeadStatus) => {
    setWorkflow((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) => {
        if (stageIndex !== index) {
          return stage;
        }

        const currentStatuses = new Set(stage.appliesToStatuses ?? []);
        if (currentStatuses.has(status)) {
          currentStatuses.delete(status);
        } else {
          currentStatuses.add(status);
        }

        const nextStatuses = Array.from(currentStatuses);

        return {
          ...stage,
          appliesToStatuses: nextStatuses.length > 0 ? nextStatuses : undefined,
        };
      }),
    }));
  };

  const handleSave = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await saveLeadWorkflowAction({ clubSlug, workflow });
        setSuccessMessage("Workflow saved. Active Leads health and follow-up dates will update immediately.");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to save workflow.",
        );
      }
    });
  };

  const handleReset = () => {
    if (!window.confirm("Reset this academy workflow to the generic default template?")) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const resetWorkflow = await resetLeadWorkflowAction({ clubSlug });
        setWorkflow(resetWorkflow);
        setSuccessMessage("Workflow reset to the default template.");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to reset workflow.",
        );
      }
    });
  };

  return (
    <div className={`space-y-6 ${isPending ? "pointer-events-none opacity-60" : ""}`}>
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Workflow overview
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            These settings drive Lead Health, next follow-up dates, banners, and daily action
            cards on Active Leads.
          </p>
        </div>

        <label className="block space-y-1">
          <span className={labelClassName}>Workflow name</span>
          <input
            type="text"
            value={workflow.name}
            onChange={(event) =>
              setWorkflow((current) => ({ ...current, name: event.target.value }))
            }
            className={inputClassName}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-dojo-white">
            <input
              type="checkbox"
              checked={workflow.recommendArchiveAfterFinalStage}
              onChange={(event) =>
                setWorkflow((current) => ({
                  ...current,
                  recommendArchiveAfterFinalStage: event.target.checked,
                }))
              }
              className="rounded border-dojo-border"
            />
            Recommend archive after final stage
          </label>

          <label className="block space-y-1">
            <span className={labelClassName}>Archive recommendation day</span>
            <input
              type="number"
              min={0}
              value={workflow.archiveAfterDays ?? ""}
              disabled={!workflow.recommendArchiveAfterFinalStage}
              onChange={(event) =>
                setWorkflow((current) => ({
                  ...current,
                  archiveAfterDays:
                    event.target.value === "" ? null : Number(event.target.value),
                }))
              }
              className={inputClassName}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Follow-up stages
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Stages run in day order. Each outbound contact advances the lead to the next active
            stage.
          </p>
        </div>

        {workflow.stages.map((stage, index) => (
          <article
            key={stage.key || `stage-${index}`}
            className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-dojo-white">
                Stage {index + 1}
                {!stage.isActive ? (
                  <span className="ml-2 text-xs font-medium uppercase text-dojo-muted">
                    Inactive
                  </span>
                ) : null}
              </h3>
              <label className="flex items-center gap-2 text-sm text-dojo-white">
                <input
                  type="checkbox"
                  checked={stage.isActive}
                  onChange={(event) =>
                    updateStage(index, { isActive: event.target.checked })
                  }
                  className="rounded border-dojo-border"
                />
                Active
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className={labelClassName}>Stage label</span>
                <input
                  type="text"
                  value={stage.label}
                  onChange={(event) => updateStage(index, { label: event.target.value })}
                  className={inputClassName}
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className={labelClassName}>Recommended action label</span>
                <input
                  type="text"
                  value={stage.recommendedActionLabel}
                  onChange={(event) =>
                    updateStage(index, { recommendedActionLabel: event.target.value })
                  }
                  className={inputClassName}
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClassName}>Trigger day</span>
                <input
                  type="number"
                  min={0}
                  value={stage.triggerDaysAfter}
                  onChange={(event) =>
                    updateStage(index, { triggerDaysAfter: Number(event.target.value) })
                  }
                  className={inputClassName}
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClassName}>Optional max day</span>
                <input
                  type="number"
                  min={0}
                  value={stage.triggerDaysAfterMax ?? ""}
                  onChange={(event) =>
                    updateStage(index, {
                      triggerDaysAfterMax:
                        event.target.value === "" ? undefined : Number(event.target.value),
                    })
                  }
                  className={inputClassName}
                />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className={labelClassName}>Applies to statuses</legend>
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_APPLIES_TO_STATUS_OPTIONS.map((status) => {
                  const isChecked = stage.appliesToStatuses?.includes(status) ?? false;

                  return (
                    <label
                      key={`${stage.key}-${status}`}
                      className="inline-flex items-center gap-2 rounded-full border border-dojo-border px-3 py-1.5 text-xs text-dojo-white"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStageStatus(index, status)}
                        className="rounded border-dojo-border"
                      />
                      {LEAD_STATUS_LABELS[status]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </article>
        ))}
      </section>

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save workflow"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleReset}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Reset to default
        </button>
      </div>
    </div>
  );
}
