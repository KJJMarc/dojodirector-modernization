import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";

function buildActions(clubSlug: string) {
  return [
    {
      label: "Students",
      href: clubAdminPath(clubSlug, "students"),
      description: "View and manage students",
    },
    {
      label: "Student Retention",
      href: clubAdminPath(clubSlug, "retention"),
      description: "Identify students at risk of leaving",
    },
    {
      label: "Instructors",
      href: clubAdminPath(clubSlug, "instructors"),
      description: "Manage instructors and class allocation",
    },
    {
      label: "Messaging",
      href: clubAdminPath(clubSlug, "messaging"),
      description: "Send updates to students and instructors",
    },
    {
      label: "Manage Classes",
      href: clubAdminPath(clubSlug, "classes"),
      description: "Recurring classes, events and sessions",
    },
    {
      label: "Class Data",
      href: clubAdminPath(clubSlug, "class-data"),
      description: "Class performance and attendance metrics",
    },
    {
      label: "Manage Bookings",
      href: clubAdminPath(clubSlug, "bookings"),
      description: "Attendance register and booking cancellations",
    },
    {
      label: "Guest Bookings",
      href: clubAdminPath(clubSlug, "guest-bookings"),
      description: "View guest and trial bookings",
    },
    {
      label: "Training Agreements",
      href: clubAdminPath(clubSlug, "training-agreements"),
      description: "Manage agreement templates and versions",
    },
    {
      label: "Belt Management",
      href: clubAdminPath(clubSlug, "belts"),
      description: "Set belt and attendance requirements",
    },
  ] as const;
}

interface AdminQuickActionsProps {
  clubSlug: string;
}

export function AdminQuickActions({ clubSlug }: AdminQuickActionsProps) {
  const actions = buildActions(clubSlug);

  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dojo-red">
        QUICK ACTIONS
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ label, href, description }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
          >
            <span className="text-base font-semibold text-dojo-white">{label}</span>
            <span className="mt-0.5 text-xs text-dojo-muted">{description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
