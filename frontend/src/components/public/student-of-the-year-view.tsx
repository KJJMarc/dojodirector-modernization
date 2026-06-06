import {
  STUDENT_OF_THE_YEAR_INTRO,
  type StudentOfTheYearPageData,
} from "@/lib/student-of-the-year.shared";

interface StudentOfTheYearViewProps {
  pageData: StudentOfTheYearPageData;
}

export function StudentOfTheYearView({ pageData }: StudentOfTheYearViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl shadow-black/30 ring-1 ring-white/10">
      <div className="border-b border-neutral-200 px-5 py-6 sm:px-8 sm:py-7">
        <p className="text-sm leading-relaxed text-neutral-600">
          {STUDENT_OF_THE_YEAR_INTRO}
        </p>
      </div>

      <div className="bg-neutral-50/70 px-4 py-6 sm:px-6 sm:py-7">
        {pageData.awards.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            No Student of the Year winners have been recorded yet.
          </p>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
              <h3 className="text-lg font-bold tracking-tight text-neutral-950">
                Winners
              </h3>
            </div>

            <ul className="divide-y divide-neutral-100">
              {pageData.awards.map((award) => (
                <li
                  key={award.id}
                  className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:px-6"
                >
                  <span className="text-base font-semibold text-neutral-950">
                    {award.year}
                  </span>
                  <span className="text-[15px] leading-7 text-neutral-800 sm:text-right">
                    {award.studentName}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
