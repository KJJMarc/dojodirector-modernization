import { HomeHeader } from "@/components/layout/home-header";
import { HomeHeroSection } from "@/components/layout/home-hero-section";
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
          <HomeHeroSection />

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
