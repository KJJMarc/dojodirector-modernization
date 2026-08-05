import {
  PUBLIC_TIMETABLE_EMPTY_MESSAGE,
  PUBLIC_TIMETABLE_WEEKDAY_ORDER,
  type PublicTimetableClassEntry,
  type PublicTimetableDayGroup,
  type PublicTimetableVenueGroup,
} from "@/lib/public-timetable.shared";
import { formatDayOfWeekLabel } from "@/lib/admin-recurring-classes.shared";

interface PublicAcademyTimetableProps {
  academyName: string;
  venues: PublicTimetableVenueGroup[];
}

/** Class cards: Dojo Director brand accents on a white timetable body. */
function ClassCard({ entry }: { entry: PublicTimetableClassEntry }) {
  return (
    <article className="flex min-h-[4.5rem] flex-col justify-center rounded-md border border-dojo-border border-l-[3px] border-l-dojo-red bg-white px-3 py-2.5 shadow-sm">
      <h4 className="text-sm font-semibold leading-snug text-dojo-black [overflow-wrap:anywhere]">
        {entry.className}
      </h4>
      <p className="mt-1 text-xs font-medium tabular-nums text-neutral-600">
        <time dateTime={entry.startTime}>{entry.timeRangeLabel}</time>
      </p>
    </article>
  );
}

function DayHeading({
  label,
  id,
}: {
  label: string;
  id?: string;
}) {
  return (
    <h3
      id={id}
      className="flex min-h-10 items-center justify-center bg-dojo-black px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-dojo-white sm:text-[0.7rem]"
    >
      {label}
    </h3>
  );
}

function MobileDaySection({
  day,
  headingId,
}: {
  day: PublicTimetableDayGroup;
  headingId: string;
}) {
  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <DayHeading id={headingId} label={day.dayLabel} />
      <ul className="space-y-2">
        {day.classes.map((entry) => (
          <li key={entry.id}>
            <ClassCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DesktopWeekGrid({ venue }: { venue: PublicTimetableVenueGroup }) {
  const dayMap = new Map(venue.days.map((day) => [day.dayOfWeek, day]));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[52rem] grid-cols-7 divide-x divide-neutral-200 border border-neutral-200 bg-white"
        role="list"
        aria-label={`${venue.venueName} weekly class timetable`}
      >
        {PUBLIC_TIMETABLE_WEEKDAY_ORDER.map((dayOfWeek) => {
          const day = dayMap.get(dayOfWeek);
          const dayLabel = day?.dayLabel ?? formatDayOfWeekLabel(dayOfWeek);

          return (
            <div key={dayOfWeek} className="min-w-0 bg-white" role="listitem">
              <DayHeading label={dayLabel} />
              <div className="space-y-2 p-2 sm:p-2.5">
                {day && day.classes.length > 0 ? (
                  <ul className="space-y-2">
                    {day.classes.map((entry) => (
                      <li key={entry.id}>
                        <ClassCard entry={entry} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 py-3 text-center text-xs text-neutral-400">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VenueTimetableSection({
  venue,
  index,
}: {
  venue: PublicTimetableVenueGroup;
  index: number;
}) {
  const headingId = `venue-${index}-heading`;

  return (
    <section
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      aria-labelledby={headingId}
    >
      <header className="space-y-1 bg-dojo-black px-4 py-3.5 sm:px-5 sm:py-4">
        <h2
          id={headingId}
          className="text-lg font-bold leading-snug tracking-tight text-dojo-white sm:text-xl"
        >
          {venue.venueName}
        </h2>
        {venue.venueAddress ? (
          <p className="text-sm leading-relaxed text-neutral-300">{venue.venueAddress}</p>
        ) : null}
      </header>

      <div className="bg-white p-3 sm:p-4">
        {/* Mobile: stacked active days only */}
        <div className="space-y-5 md:hidden">
          {venue.days.map((day) => (
            <MobileDaySection
              key={day.dayOfWeek}
              day={day}
              headingId={`venue-${index}-day-${day.dayOfWeek}-heading`}
            />
          ))}
        </div>

        {/* Desktop: full week columns */}
        <div className="hidden md:block">
          <DesktopWeekGrid venue={venue} />
        </div>
      </div>
    </section>
  );
}

export function PublicAcademyTimetable({
  academyName,
  venues,
}: PublicAcademyTimetableProps) {
  if (venues.length === 0) {
    return (
      <section
        className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center"
        aria-live="polite"
      >
        <p className="text-sm leading-relaxed text-neutral-600">
          {PUBLIC_TIMETABLE_EMPTY_MESSAGE}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      <p className="text-sm leading-relaxed text-neutral-600">
        Weekly class times for {academyName}.
      </p>
      {venues.map((venue, index) => (
        <VenueTimetableSection
          key={venue.locationKey || `unassigned-${index}`}
          venue={venue}
          index={index}
        />
      ))}
    </div>
  );
}
