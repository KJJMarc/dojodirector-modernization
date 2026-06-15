import { HomeHeroActions } from "@/components/layout/home-hero-actions";

export function HomeHeroSection() {
  return (
    <section className="border-b border-neutral-200/80 bg-gradient-to-b from-white via-white to-red-50/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-dojo-red sm:text-sm">
            Martial Arts Academy Operating System
          </p>

          <h1 className="mt-6 text-5xl font-bold uppercase leading-[0.95] tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
            <span>DOJO </span>
            <span className="text-dojo-red">DIRECTOR</span>
          </h1>

          <p className="mt-8 text-xl font-semibold leading-snug text-neutral-800 sm:text-2xl">
            Run your academy, portals and classes from one platform.
          </p>

          <p className="mt-6 text-base leading-relaxed text-neutral-600 sm:text-lg">
            Manage students, memberships, bookings, attendance, grading, agreements,
            instructor workflows and retention from a single system built for martial
            arts academies.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Students and instructors can install Dojo Director to their phone home
            screen, while admins run multi-programme, multi-academy operations behind
            the scenes.
          </p>

          <HomeHeroActions />
        </div>
      </div>
    </section>
  );
}
