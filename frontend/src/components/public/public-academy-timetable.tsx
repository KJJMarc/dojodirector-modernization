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

const VENUE_ACCENT_CLASSES = [
  "border-l-dojo-red",
  "border-l-dojo-muted",
  "border-l-dojo-white/40",
  "border-l-dojo-red/60",
] as const;

function venueAccentClass(index: number) {
  return VENUE_ACCENT_CLASSES[index % VENUE_ACCENT_CLASSES.length];
}

function ClassCard({ entry }: { entry: PublicTimetableClassEntry }) {
  return (
    <article className="flex min-h-[4.5rem] flex-col justify-center rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2.5">
      <h4 className="text-sm font-semibold leading-snug text-dojo-white [overflow-wrap:anywhere]">
        {entry.className}
      </h4>
      <p className="mt-1 text-xs font-medium tabular-nums text-dojo-muted">
        <time dateTime={entry.startTime}>{entry.timeRangeLabel}</time>
      </p>
    </article>
  );
}

function MobileDaySection({ day }: { day: PublicTimetableDayGroup }) {
  return (
    <section className="space-y-2" aria-labelledby={`day-${day.dayOfWeek}-heading`}>
      <h3
        id={`day-${day.dayOfWeek}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-dojo-red"
      >
        {day.dayLabel}
      </h3>
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
        className="grid min-w-[52rem] grid-cols-7 gap-2"
        role="list"
        aria-label={`${venue.venueName} weekly class timetable`}
      >
        {PUBLIC_TIMETABLE_WEEKDAY_ORDER.map((dayOfWeek) => {
          const day = dayMap.get(dayOfWeek);
          const dayLabel = day?.dayLabel ?? formatDayOfWeekLabel(dayOfWeek);

          return (
            <div key={dayOfWeek} className="min-w-0 space-y-2" role="listitem">
              <h3 className="border-b border-dojo-border pb-2 text-center text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                {dayLabel}
              </h3>
              {day && day.classes.length > 0 ? (
                <ul className="space-y-2">
                  {day.classes.map((entry) => (
                    <li key={entry.id}>
                      <ClassCard entry={entry} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-3 text-center text-xs text-dojo-muted/70">—</p>
              )}
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
      className={`rounded-xl border border-dojo-border border-l-4 bg-dojo-surface p-4 sm:p-5 ${venueAccentClass(index)}`}
      aria-labelledby={headingId}
    >
      <header className="mb-4 space-y-1 border-b border-dojo-border pb-3">
        <h2
          id={headingId}
          className="text-lg font-semibold leading-snug text-dojo-white sm:text-xl"
        >
          {venue.venueName}
        </h2>
        {venue.venueAddress ? (
          <p className="text-sm leading-relaxed text-dojo-muted">{venue.venueAddress}</p>
        ) : null}
      </header>

      {/* Mobile: stacked active days only */}
      <div className="space-y-5 md:hidden">
        {venue.days.map((day) => (
          <MobileDaySection key={day.dayOfWeek} day={day} />
        ))}
      </div>

      {/* Desktop: full week columns */}
      <div className="hidden md:block">
        <DesktopWeekGrid venue={venue} />
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
        className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center"
        aria-live="polite"
      >
        <p className="text-sm leading-relaxed text-dojo-muted">
          {PUBLIC_TIMETABLE_EMPTY_MESSAGE}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-dojo-muted">
        Weekly class times for {academyName}. Times are shown in UK local time.
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
