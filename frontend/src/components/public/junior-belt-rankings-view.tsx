import { JuniorBeltColourBar } from "@/components/public/belt-rankings-colour-bar";
import { BeltRankingsRecentPromotions } from "@/components/public/belt-rankings-recent-promotions";
import {
  formatJuniorStripeGroupDisplayTitle,
  getJuniorBeltSectionTheme,
  parseJuniorBeltRankParts,
  JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE,
  type JuniorBeltRankingGroup,
  type JuniorBeltRankingStudent,
  type JuniorBeltRankingsPageData,
} from "@/lib/junior-belt-rankings.shared";

interface JuniorBeltRankingsViewProps {
  pageData: JuniorBeltRankingsPageData;
}

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
  const theme = getJuniorBeltSectionTheme(
    parseJuniorBeltRankParts(group.beltName, null, group.beltColour),
  );

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
          className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${theme.badge}`}
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
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
          Junior Belt Rankings
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Last Updated: {pageData.lastUpdatedLabel}
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
