import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";

function buildActions(clubSlug: string) {
  return [
    {
      label: "Add student",
      href: clubAdminPath(clubSlug, "students/new"),
      description: "Register a new student",
    },
    {
      label: "Students",
      href: clubAdminPath(clubSlug, "students"),
      description: "View and manage students",
    },
    {
      label: "Manage Classes",
      href: clubAdminPath(clubSlug, "classes"),
      description: "Recurring classes, events and sessions",
    },
    {
      label: "Instructors",
      href: clubAdminPath(clubSlug, "instructors"),
      description: "Manage instructors and class allocation",
    },
    {
      label: "Attendance register",
      href: "/attendance",
      description: "Mark today's attendance",
    },
    { label: "Booking page", href: "/book", description: "Public class booking" },
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
        Quick actions
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
