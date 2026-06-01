"use client";

import {
  PROGRAMME_FEATURE_TOGGLES,
  formatProgrammeTypeOptionLabel,
  type AdminProgramme,
  type ProgrammeFeatureSettings,
} from "@/lib/admin-programmes.shared";

interface ProgrammeSettingsFormProps {
  clubSlug: string;
  programme: AdminProgramme;
  action: (formData: FormData) => Promise<void>;
}

function currentSettings(programme: AdminProgramme): ProgrammeFeatureSettings {
  return {
    attendanceTrackingEnabled: programme.attendanceTrackingEnabled,
    attendanceCardsEnabled: programme.attendanceCardsEnabled,
    gradingSystemEnabled: programme.gradingSystemEnabled,
    beltsRanksEnabled: programme.beltsRanksEnabled,
    retentionTrackingEnabled: programme.retentionTrackingEnabled,
    studentPortalAccessEnabled: programme.studentPortalAccessEnabled,
    classBookingEnabled: programme.classBookingEnabled,
    promotionCandidatesEnabled: programme.promotionCandidatesEnabled,
  };
}

export function ProgrammeSettingsForm({
  clubSlug,
  programme,
  action,
}: ProgrammeSettingsFormProps) {
  const settings = currentSettings(programme);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="programmeSlug" value={programme.slug} />

      <div className="space-y-2">
        <label htmlFor="programmeName" className="block text-sm font-medium text-dojo-white">
          Programme Name
        </label>
        <input
          id="programmeName"
          name="programmeName"
          type="text"
          required
          defaultValue={programme.name}
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
        />
      </div>

      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-muted">
        Programme type:{" "}
        <span className="font-medium text-dojo-white">
          {formatProgrammeTypeOptionLabel(programme.programmeType)}
        </span>
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={programme.isActive}
          className="h-4 w-4 rounded border-dojo-border"
        />
        <span className="text-sm text-dojo-white">Programme is active</span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-dojo-white">
          Programme settings
        </legend>
        <ul className="space-y-2">
          {PROGRAMME_FEATURE_TOGGLES.map(({ key, label, description }) => (
            <li
              key={key}
              className="flex items-start gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2"
            >
              <input
                id={`settings-${key}`}
                name={key}
                type="checkbox"
                defaultChecked={settings[key]}
                className="mt-1 h-4 w-4 rounded border-dojo-border"
              />
              <label htmlFor={`settings-${key}`} className="min-w-0 flex-1">
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

      <button
        type="submit"
        className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
      >
        Save Programme Settings
      </button>
    </form>
  );
}
