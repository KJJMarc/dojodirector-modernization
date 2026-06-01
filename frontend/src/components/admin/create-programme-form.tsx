"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import type { CreateProgrammeActionResult } from "@/app/admin/[clubSlug]/programmes/new/actions";
import {
  ADMIN_CREATABLE_PROGRAMME_TYPE_OPTIONS,
  parseCreatableProgrammeTypeValue,
  programmeNameForType,
  programmeSlugForType,
  type CreatableProgrammeTypeValue,
  type ProgrammeTypeValue,
} from "@/lib/admin-programmes.shared";

interface CreateProgrammeFormProps {
  clubSlug: string;
  existingProgrammeTypes: ProgrammeTypeValue[];
  action: (formData: FormData) => Promise<CreateProgrammeActionResult>;
}

export function CreateProgrammeForm({
  clubSlug,
  existingProgrammeTypes,
  action,
}: CreateProgrammeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const availableOptions = useMemo(
    () =>
      ADMIN_CREATABLE_PROGRAMME_TYPE_OPTIONS.filter(
        (option) => !existingProgrammeTypes.includes(option.value),
      ),
    [existingProgrammeTypes],
  );

  const [selectedType, setSelectedType] = useState<CreatableProgrammeTypeValue>(
    () => availableOptions[0]?.value ?? "bjj",
  );

  useEffect(() => {
    if (availableOptions.length === 0) {
      return;
    }

    if (!availableOptions.some((option) => option.value === selectedType)) {
      setSelectedType(availableOptions[0]!.value);
    }
  }, [availableOptions, selectedType]);

  const selectedName = programmeNameForType(selectedType);
  const selectedSlug = programmeSlugForType(selectedType);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("programmeType", selectedType);

    startTransition(async () => {
      const result = await action(formData);

      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.error) {
        setError(result.error);
      }
    });
  };

  if (availableOptions.length === 0) {
    return (
      <p className="text-sm text-dojo-muted">
        All standard programmes have already been created.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="programmeType"
          className="block text-sm font-medium text-dojo-white"
        >
          Programme
        </label>
        <select
          id="programmeType"
          name="programmeType"
          value={selectedType}
          disabled={isPending}
          onChange={(event) =>
            setSelectedType(parseCreatableProgrammeTypeValue(event.target.value))
          }
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
        >
          {availableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-dojo-muted">
          Choose a recognised programme type. Feature defaults are applied from
          the programme type and can be adjusted on the settings page after
          creation.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
          Programme Name
        </p>
        <p className="text-sm text-dojo-white">{selectedName}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
          Slug
        </p>
        <p className="text-sm text-dojo-muted">{selectedSlug}</p>
      </div>

      {error ? (
        <p className="text-sm text-dojo-red" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create Programme"}
      </button>
    </form>
  );
}
