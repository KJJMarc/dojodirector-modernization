import { PROGRAMMES_MIGRATION_PATH } from "@/lib/admin-programmes.shared";

interface ProgrammeManagementUnavailableNoticeProps {
  message?: string;
  showMigrationHint?: boolean;
}

export function ProgrammeManagementUnavailableNotice({
  message = "Programme Management is not yet enabled on this database.",
  showMigrationHint = true,
}: ProgrammeManagementUnavailableNoticeProps) {
  return (
    <div
      className="rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-5 text-sm leading-relaxed text-dojo-muted"
      role="status"
    >
      <p className="font-medium text-dojo-white">{message}</p>
      {showMigrationHint ? (
        <p className="mt-2">
          Apply the programmes migration in the Supabase SQL Editor:{" "}
          <code className="text-xs text-dojo-white">{PROGRAMMES_MIGRATION_PATH}</code>
        </p>
      ) : null}
      <p className="mt-2">
        BJJ student management, classes, bookings and attendance continue to work
        using the existing legacy setup until the migration is applied.
      </p>
    </div>
  );
}
