import Link from "next/link";
import { adminDashboardAttendanceRegisterPath } from "@/lib/attendance-register-navigation.shared";
import { clubBookingPath, KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

/**
 * Phase 1 stub links to legacy flat /admin routes until pages move under /admin/[clubSlug].
 */
export function ClubAdminStubActions() {
  const actions = [
    { label: "Students", href: "/admin/students/programmes", description: "Programme student areas" },
    {
      label: "Manage Classes",
      href: "/admin/classes",
      description: "Recurring classes, events and sessions",
    },
    {
      label: "Instructors",
      href: "/admin/instructors",
      description: "Manage instructors and class allocation",
    },
    {
      label: "Attendance Register",
      href: adminDashboardAttendanceRegisterPath(KINGSTON_CLUB_SLUG),
      description: "Mark today's attendance",
    },
    {
      label: "Booking Page",
      href: clubBookingPath(KINGSTON_CLUB_SLUG),
      description: "Public class booking",
    },
  ] as const;

  return (
    <section aria-label="Club admin actions">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Club admin
      </h2>
      <p className="mb-4 text-xs text-dojo-muted">
        Phase 1 links to the current admin pages. Club-scoped routes will replace these
        in a later update.
      </p>
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
