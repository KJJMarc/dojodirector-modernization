import { AdultBeltColourBar } from "@/components/public/belt-rankings-colour-bar";
import { BeltRankingsRecentPromotions } from "@/components/public/belt-rankings-recent-promotions";
import {
  ADULT_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE,
  formatStripeGroupDisplayTitle,
  type AdultBeltRankingDegreeGroup,
  type AdultBeltRankingGroup,
  type AdultBeltRankingStripeGroup,
  type AdultBeltRankingStudent,
  type AdultBeltRankingsPageData,
  type MajorAdultBeltColor,
} from "@/lib/adult-belt-rankings.shared";

interface AdultBeltRankingsViewProps {
  pageData: AdultBeltRankingsPageData;
}

const BELT_SECTION_THEMES: Record<
  MajorAdultBeltColor,
  {
    accent: string;
    badge: string;
    ring: string;
    heading: string;
  }
> = {
  black: {
    accent: "bg-neutral-900",
    badge: "bg-neutral-900 text-white",
    ring: "ring-neutral-900/10",
    heading: "text-neutral-950",
  },
  brown: {
    accent: "bg-amber-800",
    badge: "bg-amber-800 text-white",
    ring: "ring-amber-800/15",
    heading: "text-amber-950",
  },
  purple: {
    accent: "bg-purple-700",
    badge: "bg-purple-700 text-white",
    ring: "ring-purple-700/15",
    heading: "text-purple-950",
  },
  blue: {
    accent: "bg-blue-700",
    badge: "bg-blue-700 text-white",
    ring: "ring-blue-700/15",
    heading: "text-blue-950",
  },
  white: {
    accent: "bg-neutral-400",
    badge: "bg-neutral-500 text-white",
    ring: "ring-neutral-400/20",
    heading: "text-neutral-800",
  },
};

function NameList({ students }: { students: AdultBeltRankingStudent[] }) {
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
  students: AdultBeltRankingStudent[];
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

function getSubsectionTitle(
  group: AdultBeltRankingGroup,
  subsection: AdultBeltRankingDegreeGroup | AdultBeltRankingStripeGroup,
) {
  if (group.degreeGroups) {
    return (subsection as AdultBeltRankingDegreeGroup).rankLabel;
  }

  const stripeGroup = subsection as AdultBeltRankingStripeGroup;

  return formatStripeGroupDisplayTitle(
    group.beltColor,
    stripeGroup.stripeCount,
    stripeGroup.rankLabel,
  );
}

function BeltRankingsSection({ group }: { group: AdultBeltRankingGroup }) {
  const theme = BELT_SECTION_THEMES[group.beltColor];
  const subsections = group.degreeGroups ?? group.stripeGroups ?? [];

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ring-1 ${theme.ring}`}
    >
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
        <AdultBeltColourBar beltColor={group.beltColor} />
        <div className="min-w-0 flex-1">
          <h3 className={`text-xl font-bold tracking-tight ${theme.heading}`}>
            {group.sectionLabel}
          </h3>
        </div>
        <span
          className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${theme.badge}`}
        >
          {group.totalStudents}
        </span>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {subsections.map((subsection, index) => (
          <RankSubsection
            key={subsection.beltLevelId}
            title={getSubsectionTitle(group, subsection)}
            students={subsection.students}
            isLast={index === subsections.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

export function AdultBeltRankingsView({ pageData }: AdultBeltRankingsViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl shadow-black/30 ring-1 ring-white/10">
      <div className="border-b border-neutral-200 px-5 py-6 sm:px-8 sm:py-7">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
          Adult Belt Rankings
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Last Updated: {pageData.lastUpdatedLabel}
        </p>
      </div>

      <div className="space-y-5 bg-neutral-50/70 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-7">
        <BeltRankingsRecentPromotions
          title="Congratulations To Our Recently Promoted Students"
          message={ADULT_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE}
          emptyMessage="No belt promotions have been awarded in the last 30 days."
          promotions={pageData.recentPromotions}
        />

        {pageData.beltGroups.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            No active adult belt rankings are available at the moment.
          </p>
        ) : (
          pageData.beltGroups.map((group) => (
            <BeltRankingsSection key={group.beltColor} group={group} />
          ))
        )}
      </div>
    </div>
  );
}
