import Link from "next/link";
import { instructorPortalPath } from "@/lib/instructor-portal.shared";

export interface InstructorQuickActionItem {
  label: string;
  href: string;
  description: string;
}

interface InstructorQuickActionsProps {
  slug: string;
  extraActions?: readonly InstructorQuickActionItem[];
  sectionTitle?: string;
}

export function InstructorQuickActions({
  slug,
  extraActions = [],
  sectionTitle = "ACTIONS",
}: InstructorQuickActionsProps) {
  const actions: InstructorQuickActionItem[] = [
    {
      label: "Attendance Register",
      href: "/attendance",
      description: "Mark attendance for today's classes.",
    },
    {
      label: "Session Cover",
      href: instructorPortalPath(slug, "session-cover"),
      description: "View who is teaching upcoming classes.",
    },
    {
      label: "My Classes",
      href: instructorPortalPath(slug, "my-classes"),
      description: "View your assigned recurring classes and upcoming sessions.",
    },
    ...extraActions,
  ];

  return (
    <section aria-label="Instructor actions">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dojo-red">
        {sectionTitle}
      </h2>
      <div className="grid gap-3">
        {actions.map(({ label, href, description }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-5 py-4 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
          >
            <span className="text-lg font-semibold text-dojo-white">{label}</span>
            <span className="mt-1 text-sm text-dojo-muted">{description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
