import {
  getJuniorBeltAccentClass,
  JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE,
  type JuniorBeltRankingGroup,
  type JuniorBeltRankingStudent,
  type JuniorBeltRankingsPageData,
  type JuniorBeltRecentPromotion,
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

function BeltRankingsSection({ group }: { group: JuniorBeltRankingGroup }) {
  const theme = getJuniorBeltAccentClass(group.rankLabel);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ring-1 ${theme.ring}`}
    >
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className={`h-9 w-1.5 shrink-0 rounded-full ${theme.accent}`}
        />
        <div className="min-w-0 flex-1">
          <h3 className={`text-xl font-bold tracking-tight ${theme.heading}`}>
            {group.rankLabel}
          </h3>
        </div>
        <span
          className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${theme.badge}`}
        >
          {group.students.length}
        </span>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <NameList students={group.students} />
      </div>
    </section>
  );
}

function RecentPromotionLine({ promotion }: { promotion: JuniorBeltRecentPromotion }) {
  return (
    <li className="list-none border-b border-red-100 py-2 text-[15px] leading-relaxed text-neutral-900 last:border-b-0">
      {promotion.studentName} — {promotion.newRankLabel} — {promotion.promotionDateLabel}
    </li>
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
        {pageData.beltGroups.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            No junior belt rankings are available yet.
          </p>
        ) : (
          pageData.beltGroups.map((group) => (
            <BeltRankingsSection key={group.beltLevelId} group={group} />
          ))
        )}

        <section className="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-white shadow-sm">
          <div className="border-l-4 border-red-700 px-5 py-5 sm:px-6">
            <h3 className="text-lg font-bold tracking-tight text-neutral-950">
              Congratulations To Our Recently Promoted Junior Students
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              {JUNIOR_BELT_RANKINGS_RECENT_PROMOTIONS_MESSAGE}
            </p>

            {pageData.recentPromotions.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600">
                No junior belt promotions have been awarded in the last 30 days.
              </p>
            ) : (
              <ul className="mt-3">
                {pageData.recentPromotions.map((promotion) => (
                  <RecentPromotionLine
                    key={`${promotion.userId}-${promotion.promotionDateKey}-${promotion.newRankLabel}`}
                    promotion={promotion}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
