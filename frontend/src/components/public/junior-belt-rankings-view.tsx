import { JuniorBeltColourBar } from "@/components/public/belt-rankings-colour-bar";
import { BeltRankingsRecentPromotions } from "@/components/public/belt-rankings-recent-promotions";
import {
  formatJuniorStripeGroupDisplayTitle,
  parseJuniorBeltRankParts,
  JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE,
  type JuniorBeltBaseColor,
  type JuniorBeltRankingGroup,
  type JuniorBeltRankingStudent,
  type JuniorBeltRankingsPageData,
} from "@/lib/junior-belt-rankings.shared";

interface JuniorBeltRankingsViewProps {
  pageData: JuniorBeltRankingsPageData;
}

/**
 * Theme classes must live in this component file so Tailwind's content scanner
 * includes them (lib/*.shared.ts is outside the Tailwind content paths).
 */
const JUNIOR_BELT_SECTION_THEMES: Record<
  JuniorBeltBaseColor,
  { badge: string; ring: string; heading: string }
> = {
  green: {
    badge: "bg-green-700 text-white",
    ring: "ring-green-700/15",
    heading: "text-green-950",
  },
  orange: {
    badge: "bg-orange-600 text-white",
    ring: "ring-orange-600/15",
    heading: "text-orange-950",
  },
  yellow: {
    badge: "bg-yellow-600 text-white",
    ring: "ring-yellow-500/20",
    heading: "text-yellow-950",
  },
  grey: {
    badge: "bg-neutral-600 text-white",
    ring: "ring-neutral-500/15",
    heading: "text-neutral-900",
  },
  white: {
    badge: "bg-neutral-500 text-white",
    ring: "ring-neutral-300/25",
    heading: "text-neutral-800",
  },
};

function NameList({ students }: { students: JuniorBeltRankingStudent[] }) {
  return (
    <ul className="mt-2 columns-1 gap-x-10 pl-0 sm:columns-2">
      {students.map((student) => (
        <li
          key={student.userId}
          className="mb-1.5 break-inside-avoid list-none text-[15px] leading-7 text-neutral-800"
        >
          {student.fullName}
        </li>
      ))}
    </ul>
  );
}

function RankSubsection({
  title,
  students,
  isLast,
}: {
  title: string;
  students: JuniorBeltRankingStudent[];
  isLast: boolean;
}) {
  return (
    <div
      className={`pt-4 first:pt-0 ${isLast ? "" : "border-b border-neutral-200/80 pb-4"}`}
    >
      <h4 className="text-sm font-semibold tracking-wide text-neutral-900">{title}</h4>
      <NameList students={students} />
    </div>
  );
}

function BeltRankingsSection({ group }: { group: JuniorBeltRankingGroup }) {
  const parts = parseJuniorBeltRankParts(group.beltName, null, group.beltColour);
  const theme = JUNIOR_BELT_SECTION_THEMES[parts.baseColor];

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ring-1 ${theme.ring}`}
    >
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
        <JuniorBeltColourBar sectionKey={group.sectionKey} />
        <div className="min-w-0 flex-1">
          <h3 className={`text-xl font-bold tracking-tight ${theme.heading}`}>
            {group.sectionLabel}
          </h3>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${theme.badge}`}
          aria-label={`${group.totalStudents} students`}
        >
          {group.totalStudents}
        </span>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {group.stripeGroups.map((stripeGroup, index) => (
          <RankSubsection
            key={stripeGroup.beltLevelId}
            title={formatJuniorStripeGroupDisplayTitle(stripeGroup.stripeCount)}
            students={stripeGroup.students}
            isLast={index === group.stripeGroups.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

export function JuniorBeltRankingsView({ pageData }: JuniorBeltRankingsViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl shadow-black/30 ring-1 ring-white/10">
      <div className="border-b border-neutral-200 px-5 py-6 sm:px-8 sm:py-7">
        <p className="text-sm text-neutral-500">
          Last updated: {pageData.lastUpdatedLabel}
        </p>
      </div>

      <div className="space-y-5 bg-neutral-50/70 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-7">
        <BeltRankingsRecentPromotions
          title="Congratulations To Our Recently Promoted Junior Students"
          message={JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE}
          emptyMessage="No junior belt promotions have been awarded in the last 30 days."
          promotions={pageData.recentPromotions}
        />

        {pageData.beltGroups.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            No junior belt rankings are available yet.
          </p>
        ) : (
          pageData.beltGroups.map((group) => (
            <BeltRankingsSection key={group.sectionKey} group={group} />
          ))
        )}
      </div>
    </div>
  );
}
