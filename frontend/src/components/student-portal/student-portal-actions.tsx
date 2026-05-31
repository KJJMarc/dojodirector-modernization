import Link from "next/link";

const PORTAL_ACTIONS = [
  { label: "Book a Class", path: "book" },
  { label: "Upcoming Bookings", path: "bookings" },
  { label: "Messages", path: "messages" },
] as const;

interface StudentPortalActionsProps {
  userId: string;
}

export function StudentPortalActions({ userId }: StudentPortalActionsProps) {
  const basePath = `/student-portal/${userId}`;

  return (
    <section aria-label="Portal navigation">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PORTAL_ACTIONS.map(({ label, path }) => (
          <Link
            key={path}
            href={`${basePath}/${path}`}
            className="flex min-h-[88px] items-center justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 text-center transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
          >
            <span className="text-base font-semibold text-dojo-white">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
