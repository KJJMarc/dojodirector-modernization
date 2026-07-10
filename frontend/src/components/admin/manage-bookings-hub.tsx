import Link from "next/link";
import { manageBookingsAttendanceRegisterPath } from "@/lib/attendance-register-navigation.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface ManageBookingsHubProps {
  clubSlug: string;
}

interface HubAction {
  label: string;
  href: string;
  description: string;
}

interface HubSection {
  title: string;
  ariaLabel: string;
  description: string;
  actions: HubAction[];
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

const sectionHeadingClassName =
  "text-sm font-semibold uppercase tracking-wide text-dojo-red";

function buildHubSections(clubSlug: string): HubSection[] {
  return [
    {
      title: "BOOKING MANAGEMENT",
      ariaLabel: "Booking management",
      description: "Create, manage and cancel student bookings.",
      actions: [
        {
          label: "Make Bookings",
          href: clubAdminPath(clubSlug, "bookings/make"),
          description: "Block-book students and manage recurring class bookings",
        },
        {
          label: "Cancel Bookings",
          href: clubAdminPath(clubSlug, "bookings/cancel"),
          description: "View upcoming sessions and cancel student bookings",
        },
      ],
    },
    {
      title: "REGISTERS & GUESTS",
      ariaLabel: "Registers and guests",
      description: "Manage class attendance and guest or trial bookings.",
      actions: [
        {
          label: "Attendance Register",
          href: manageBookingsAttendanceRegisterPath(clubSlug),
          description: "Mark and review class attendance",
        },
        {
          label: "Guest Bookings",
          href: clubAdminPath(clubSlug, "guest-bookings"),
          description: "View guest and trial bookings",
        },
      ],
    },
  ];
}

function HubActionCard({ label, href, description }: HubAction) {
  return (
    <Link href={href} className={actionCardClassName}>
      <span className="text-base font-semibold text-dojo-white">{label}</span>
      <span className="mt-1 text-xs text-dojo-muted">{description}</span>
    </Link>
  );
}

export function ManageBookingsHub({ clubSlug }: ManageBookingsHubProps) {
  const sections = buildHubSections(clubSlug);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.title} aria-label={section.ariaLabel} className="space-y-3">
          <h2 className={sectionHeadingClassName}>{section.title}</h2>
          <p className="text-sm text-dojo-muted">{section.description}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.actions.map((action) => (
              <HubActionCard key={action.href} {...action} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
