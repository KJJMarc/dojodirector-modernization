import { AdminDashboardStats } from "@/lib/admin-dashboard";

interface AdminSummaryCardsProps {
  stats: AdminDashboardStats;
}

const cards: {
  key: keyof AdminDashboardStats;
  label: string;
  valueClass?: string;
}[] = [
  { key: "todaysSessions", label: "Today's Sessions" },
  { key: "bookedToday", label: "Booked Today" },
  { key: "presentToday", label: "Present Today", valueClass: "text-green-500" },
  { key: "studentsTotal", label: "Active Students" },
];

export function AdminSummaryCards({ stats }: AdminSummaryCardsProps) {
  return (
    <section aria-label="Dashboard summary">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dojo-red">
        TODAY AT A GLANCE
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ key, label, valueClass }) => (
          <article
            key={key}
            className="rounded-xl border border-dojo-border bg-dojo-surface p-4 text-center"
          >
            <p
              className={`text-2xl font-semibold tabular-nums sm:text-3xl ${valueClass ?? "text-dojo-white"}`}
            >
              {stats[key]}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-dojo-muted sm:text-xs">
              {label}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
