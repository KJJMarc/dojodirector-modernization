import Link from "next/link";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { clubAcademyPagesAdminPath } from "@/lib/admin-academy-pages.shared";
import { clubBeltManagementAdminPath } from "@/lib/admin-belt-systems.shared";
import { clubCompetitionBracketGeneratorPath } from "@/lib/admin-competition-bracket.shared";
import {
  clubProgrammeStudentAreasPath,
  clubProgrammesAdminPath,
} from "@/lib/admin-programmes.shared";
import { getProgrammesSchemaAvailable } from "@/lib/admin-programmes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { clubLeadSourceAnalyticsAdminPath } from "@/lib/lead-source-analytics.shared";

interface DashboardAction {
  label: string;
  href: string;
  description: string;
}

const CARD_CLASS =
  "flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

const SECTION_HEADING_CLASS =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-dojo-red";

function buildDashboardSections(
  clubSlug: string,
  programmesSchemaAvailable: boolean,
) {
  const programmeActions: DashboardAction[] = programmesSchemaAvailable
    ? [
        {
          label: "Programme Management",
          href: clubProgrammesAdminPath(clubSlug),
          description:
            "View, edit, activate and create programmes for your club",
        },
      ]
    : [];

  programmeActions.push(
    {
      label: "Belt Management",
      href: clubBeltManagementAdminPath(clubSlug),
      description: "Manage belt systems, grading structures and progression rules",
    },
    {
      label: "Training Agreements",
      href: clubAdminPath(clubSlug, "training-agreements"),
      description: "Manage agreement templates and versions",
    },
    {
      label: "Academy Pages",
      href: clubAcademyPagesAdminPath(clubSlug),
      description: "Manage and view public-facing academy pages",
    },
  );

  programmeActions.push({
    label: "Competition Bracket Generator",
    href: clubCompetitionBracketGeneratorPath(clubSlug),
    description: "Create printable knockout tournament brackets",
  });

  return [
    {
      title: "ACADEMY MANAGEMENT",
      ariaLabel: "Academy management",
      actions: programmeActions,
      showProgrammesUnavailableNotice: !programmesSchemaAvailable,
    },
    {
      title: "STUDENTS & INSTRUCTORS",
      ariaLabel: "Students and instructors",
      actions: [
        {
          label: "Students",
          href: clubProgrammeStudentAreasPath(clubSlug),
          description: "Programme student areas",
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
      ],
      showProgrammesUnavailableNotice: false,
    },
    {
      title: "CLASSES & ATTENDANCE",
      ariaLabel: "Classes and attendance",
      actions: [
        {
          label: "Manage Classes",
          href: clubAdminPath(clubSlug, "classes/edit"),
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
      ],
      showProgrammesUnavailableNotice: false,
    },
    {
      title: "ENQUIRIES & LEADS",
      ariaLabel: "Enquiries and leads",
      actions: [
        {
          label: "Manage Leads",
          href: clubAdminPath(clubSlug, "leads"),
          description: "Trial enquiries and follow-up",
        },
        {
          label: "Lead Source Analytics",
          href: clubLeadSourceAnalyticsAdminPath(clubSlug),
          description: "Funnel and student quality by enquiry source",
        },
      ],
      showProgrammesUnavailableNotice: false,
    },
  ] as const;
}

function DashboardActionCard({ label, href, description }: DashboardAction) {
  return (
    <Link href={href} className={CARD_CLASS}>
      <span className="text-base font-semibold text-dojo-white">{label}</span>
      <span className="mt-0.5 text-xs text-dojo-muted">{description}</span>
    </Link>
  );
}

function DashboardSection({
  title,
  ariaLabel,
  actions,
  showProgrammesUnavailableNotice,
}: {
  title: string;
  ariaLabel: string;
  actions: readonly DashboardAction[];
  showProgrammesUnavailableNotice: boolean;
}) {
  return (
    <section aria-label={ariaLabel}>
      <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
      {showProgrammesUnavailableNotice ? (
        <div className="mb-3">
          <ProgrammeManagementUnavailableNotice showMigrationHint={false} />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <DashboardActionCard key={action.href} {...action} />
        ))}
      </div>
    </section>
  );
}

interface AdminQuickActionsProps {
  clubSlug: string;
}

export async function AdminQuickActions({ clubSlug }: AdminQuickActionsProps) {
  const programmesSchemaAvailable = await getProgrammesSchemaAvailable();
  const sections = buildDashboardSections(clubSlug, programmesSchemaAvailable);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <DashboardSection
          key={section.title}
          title={section.title}
          ariaLabel={section.ariaLabel}
          actions={section.actions}
          showProgrammesUnavailableNotice={section.showProgrammesUnavailableNotice}
        />
      ))}
    </div>
  );
}
