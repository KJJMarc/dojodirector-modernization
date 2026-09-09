import { BookingSessionCard } from "@/components/booking/booking-session-card";
import { BookableSessionGroup } from "@/lib/booking";

interface BookingDateGroupProps {
  group: BookableSessionGroup;
  onBookSession: (classSessionId: string) => void;
  sessionActionLabel?: string | ((session: BookableSessionGroup["sessions"][number]) => string);
  sessionActionDisabled?: (session: BookableSessionGroup["sessions"][number]) => boolean;
}

export function BookingDateGroup({
  group,
  onBookSession,
  sessionActionLabel,
  sessionActionDisabled,
}: BookingDateGroupProps) {
  return (
    <section className="space-y-2">
      <div className="sticky top-[7.5rem] z-10 space-y-0.5 border-b border-neutral-200 bg-neutral-50/95 py-2 backdrop-blur">
        <h2 className="text-sm font-semibold text-neutral-900">{group.dateLabel}</h2>
        <p className="text-xs text-neutral-500">{group.dayLabel}</p>
      </div>
      <div className="space-y-2">
        {group.sessions.map((session) => (
          <BookingSessionCard
            key={session.id}
            session={session}
            onBookSession={onBookSession}
            sessionActionLabel={
              typeof sessionActionLabel === "function"
                ? sessionActionLabel(session)
                : sessionActionLabel
            }
            sessionActionDisabled={sessionActionDisabled?.(session) ?? false}
          />
        ))}
      </div>
    </section>
  );
}
