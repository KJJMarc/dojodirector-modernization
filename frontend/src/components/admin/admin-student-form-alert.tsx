import type { AdminStudentFormAlertContent } from "@/lib/admin-student-form.shared";

interface AdminStudentFormAlertProps {
  alert: AdminStudentFormAlertContent;
}

export function AdminStudentFormAlert({ alert }: AdminStudentFormAlertProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white"
    >
      <p className="font-semibold text-dojo-red">{alert.title}</p>
      <div className="mt-2 space-y-2 text-dojo-muted">
        {alert.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
