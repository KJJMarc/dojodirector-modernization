import { HomeHeader } from "@/components/layout/home-header";
import { HomeHeroActions } from "@/components/layout/home-hero-actions";
import { HomeLoginProvider } from "@/components/layout/home-login-context";
import { PRODUCT_NAME } from "@/lib/branding";

const FEATURES = [
  {
    title: "Student Records",
    description:
      "Keep member profiles, contact details and academy information in one organised place.",
  },
  {
    title: "Class Booking",
    description:
      "Let students browse upcoming sessions and reserve places on the class timetable.",
  },
  {
    title: "Attendance Tracking",
    description:
      "Mark attendance quickly from class registers and maintain reliable participation records.",
  },
  {
    title: "Grading History",
    description:
      "Track belt awards and progression over time with clear grading history for each student.",
  },
] as const;

export default function Home() {
  return (
    <HomeLoginProvider>
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <HomeHeader />

        <main>
          <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-dojo-red/10 blur-3xl sm:h-96 sm:w-96"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-neutral-200/80 blur-3xl"
            />

            <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dojo-red">
                  Academy management platform
                </p>
                <h1 className="mt-4 text-5xl font-bold uppercase leading-none tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
                  {PRODUCT_NAME}
                </h1>
                <p className="mt-6 text-xl font-semibold leading-snug text-neutral-800 sm:text-2xl">
                  Martial arts academy management made simple.
                </p>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
                  Manage students, class bookings, attendance records, instructor
                  schedules and grading history from one clean, central system.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
                  Built for busy martial arts academies that need a simple way to
                  keep classes organised, students supported and attendance records
                  up to date.
                </p>

                <HomeHeroActions />
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-dojo-black to-neutral-900 py-16 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.18),_transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-dojo-red/40 to-transparent"
            />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mb-10 max-w-2xl">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
                  Platform features
                </h2>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  Everything your academy needs day to day
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base">
                  A focused set of tools for running classes, supporting students
                  and keeping your team aligned.
                </p>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                {FEATURES.map((feature) => (
                  <li
                    key={feature.title}
                    className="rounded-xl border border-dojo-border/80 bg-dojo-surface/90 p-6 shadow-lg shadow-black/20 transition hover:border-dojo-red/40"
                  >
                    <div className="mb-3 h-1 w-10 rounded-full bg-dojo-red" />
                    <h3 className="text-lg font-semibold text-dojo-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
                      {feature.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>

        <footer className="border-t border-neutral-800 bg-neutral-950 py-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
            {PRODUCT_NAME}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Martial arts academy management
          </p>
        </footer>
      </div>
    </HomeLoginProvider>
  );
}
