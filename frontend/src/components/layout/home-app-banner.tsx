import Link from "next/link";
import { HOME_APP_BANNER } from "@/lib/home-platform-content";

export function HomeAppBanner() {
  return (
    <section
      id="dojo-director-app"
      aria-labelledby="dojo-director-app-heading"
      className="relative overflow-hidden border-y border-dojo-red/30 bg-gradient-to-br from-dojo-black via-neutral-950 to-dojo-black py-14 sm:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.22),_transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-dojo-red/50 to-transparent"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            {HOME_APP_BANNER.eyebrow}
          </p>
          <h2
            id="dojo-director-app-heading"
            className="mt-2 text-3xl font-semibold text-white sm:text-4xl"
          >
            {HOME_APP_BANNER.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-300 sm:text-base">
            {HOME_APP_BANNER.description}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={HOME_APP_BANNER.primaryCta.href}
              className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-dojo-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-dojo-red-hover active:scale-[0.99]"
            >
              {HOME_APP_BANNER.primaryCta.label}
            </Link>
            <Link
              href={HOME_APP_BANNER.secondaryCta.href}
              className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-5 py-3 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
            >
              {HOME_APP_BANNER.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-dojo-border/80 bg-dojo-surface/90 p-6 shadow-xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            On your home screen
          </p>
          <p className="mt-2 text-base font-semibold text-dojo-white">
            Install from Safari or Chrome — then open in full-screen standalone mode.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {HOME_APP_BANNER.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 text-sm leading-relaxed text-dojo-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dojo-red"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
