import { BookingSessionCard } from "@/components/booking/booking-session-card";
import { BookableSessionGroup } from "@/lib/booking";

interface BookingDateGroupProps {
  group: BookableSessionGroup;
  onBookSession: (classSessionId: string) => void;
  sessionActionLabel?: string;
}

export function BookingDateGroup({
  group,
  onBookSession,
  sessionActionLabel,
}: BookingDateGroupProps) {
  return (
    <section className="space-y-2">
      <div className="sticky top-[7.5rem] z-10 space-y-0.5 border-b border-dojo-border bg-dojo-black/95 py-2 backdrop-blur">
        <h2 className="text-sm font-semibold text-dojo-white">{group.dateLabel}</h2>
        <p className="text-xs text-dojo-muted">{group.dayLabel}</p>
      </div>
      <div className="space-y-2">
        {group.sessions.map((session) => (
          <BookingSessionCard
            key={session.id}
            session={session}
            onBookSession={onBookSession}
            sessionActionLabel={sessionActionLabel}
          />
        ))}
      </div>
    </section>
  );
}
