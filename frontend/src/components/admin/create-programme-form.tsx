"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { CreateProgrammeActionResult } from "@/app/admin/[clubSlug]/programmes/new/actions";
import {
  CREATE_PROGRAMME_TEMPLATE_OPTIONS,
  PROGRAMME_FEATURE_TOGGLES,
  defaultProgrammeSettingsForCreateTemplate,
  inferProgrammeTypeFromSlug,
  isProgrammeSlugTakenInClub,
  parseCreateProgrammeTemplateValue,
  programmeTypeEnablesAdminArea,
  slugifyProgrammeName,
  type CreateProgrammeTemplateValue,
  type ProgrammeFeatureSettings,
} from "@/lib/admin-programmes.shared";

interface CreateProgrammeFormProps {
  clubSlug: string;
  existingProgrammeSlugs: string[];
  action: (formData: FormData) => Promise<CreateProgrammeActionResult>;
}

export function CreateProgrammeForm({
  clubSlug,
  existingProgrammeSlugs,
  action,
}: CreateProgrammeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<CreateProgrammeTemplateValue>("blank");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [settings, setSettings] = useState<ProgrammeFeatureSettings>(() =>
    defaultProgrammeSettingsForCreateTemplate("blank"),
  );
  const [adminAreaEnabled, setAdminAreaEnabled] = useState(true);

  useEffect(() => {
    setSettings(defaultProgrammeSettingsForCreateTemplate(template));
  }, [template]);

  const inferredProgrammeType = useMemo(
    () => (slug.trim() ? inferProgrammeTypeFromSlug(slug) : null),
    [slug],
  );

  const slugTaken = useMemo(
    () =>
      slug.trim()
        ? isProgrammeSlugTakenInClub(slug, existingProgrammeSlugs)
        : false,
    [existingProgrammeSlugs, slug],
  );

  const adminAreaBlocked =
    inferredProgrammeType !== null &&
    !programmeTypeEnablesAdminArea(inferredProgrammeType);

  const handleNameChange = (value: string) => {
    setName(value);

    if (!slugManuallyEdited) {
      setSlug(slugifyProgrammeName(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (slugTaken) {
      setError("A programme with this slug already exists at this academy.");
      return;
    }

    if (adminAreaBlocked) {
      setError(
        "Strength & Conditioning cannot be enabled as a programme admin area yet.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("programmeName", name);
    formData.set("programmeSlug", slug);
    formData.set("programmeTemplate", template);
    formData.set("adminAreaEnabled", adminAreaEnabled ? "on" : "off");

    for (const { key } of PROGRAMME_FEATURE_TOGGLES) {
      if (settings[key]) {
        formData.set(key, "on");
      }
    }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="programmeTemplate"
          className="block text-sm font-medium text-dojo-white"
        >
          Template (optional)
        </label>
        <select
          id="programmeTemplate"
          name="programmeTemplate"
          value={template}
          disabled={isPending}
          onChange={(event) =>
            setTemplate(parseCreateProgrammeTemplateValue(event.target.value))
          }
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
        >
          {CREATE_PROGRAMME_TEMPLATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-dojo-muted">
          Prefills feature toggles only. Name and slug stay editable.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="programmeName"
          className="block text-sm font-medium text-dojo-white"
        >
          Programme Name
        </label>
        <input
          id="programmeName"
          name="programmeName"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={name}
          disabled={isPending}
          onChange={(event) => handleNameChange(event.target.value)}
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="programmeSlug"
          className="block text-sm font-medium text-dojo-white"
        >
          Slug
        </label>
        <input
          id="programmeSlug"
          name="programmeSlug"
          type="text"
          required
          maxLength={60}
          value={slug}
          disabled={isPending}
          onChange={(event) => handleSlugChange(event.target.value)}
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
        />
        <p className="text-xs text-dojo-muted">
          Lowercase letters, numbers, and hyphens. Auto-generated from the name
          until you edit this field.
        </p>
        {slugTaken ? (
          <p className="text-xs text-dojo-red" role="alert">
            This slug is already used at this academy.
          </p>
        ) : null}
        {adminAreaBlocked ? (
          <p className="text-xs text-dojo-red" role="alert">
            The strength-conditioning slug cannot be used for a programme admin
            area.
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2">
        <input
          type="checkbox"
          name="adminAreaEnabled"
          checked={adminAreaEnabled}
          disabled={isPending || adminAreaBlocked}
          onChange={(event) => setAdminAreaEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-dojo-border"
        />
        <span className="text-sm text-dojo-white">
          Show in Programme Management
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-dojo-white">
          Programme features
        </legend>
        <ul className="space-y-2">
          {PROGRAMME_FEATURE_TOGGLES.map(({ key, label, description }) => (
            <li
              key={key}
              className="flex items-start gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2"
            >
              <input
                id={`create-${key}`}
                name={key}
                type="checkbox"
                checked={settings[key]}
                disabled={isPending}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-dojo-border"
              />
              <label htmlFor={`create-${key}`} className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-dojo-white">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-dojo-muted">
                  {description}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {error ? (
        <p className="text-sm text-dojo-red" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || slugTaken || adminAreaBlocked || !name.trim()}
        className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create Programme"}
      </button>
    </form>
  );
}
