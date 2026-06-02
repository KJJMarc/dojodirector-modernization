import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";

interface StudentPortalAccessDeniedProps {
  message: string;
  clubName?: string | null;
  title?: string;
}

export function StudentPortalAccessDenied({
  message,
  clubName,
  title = "Access denied",
}: StudentPortalAccessDeniedProps) {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">{title}</h2>
        {clubName ? (
          <p className="mt-1 text-sm font-medium text-dojo-white">{clubName}</p>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-dojo-muted">{message}</p>
      </div>

      <StudentPortalSignOutButton />
    </section>
  );
}
