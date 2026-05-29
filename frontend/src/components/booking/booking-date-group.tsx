import { BookingSessionCard } from "@/components/booking/booking-session-card";
import { BookableSessionGroup } from "@/lib/booking";

interface BookingDateGroupProps {
  group: BookableSessionGroup;
  onBookSession: (classSessionId: string) => void;
}

export function BookingDateGroup({
  group,
  onBookSession,
}: BookingDateGroupProps) {
  return (
    <section className="space-y-2">
      <h2 className="sticky top-[7.5rem] z-10 border-b border-dojo-border bg-dojo-black/95 py-2 text-sm font-semibold uppercase tracking-wide text-dojo-red backdrop-blur">
        {group.dateLabel}
      </h2>
      <div className="space-y-2">
        {group.sessions.map((session) => (
          <BookingSessionCard
            key={session.id}
            session={session}
            onBookSession={onBookSession}
          />
        ))}
      </div>
    </section>
  );
}
