import Link from "next/link";
import { HOME_APP_BANNER } from "@/lib/home-platform-content";

export function HomeAppBanner() {
  return (
    <section
      id="dojo-director-app"
      aria-labelledby="dojo-director-app-heading"
      className="bg-neutral-50 px-4 py-10 sm:px-6 sm:py-12"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-dojo-red/25 bg-gradient-to-br from-neutral-950 via-dojo-black to-neutral-900 shadow-2xl shadow-black/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-dojo-red/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-dojo-red/60 to-transparent"
        />

        <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-10 lg:p-14">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dojo-red sm:text-sm">
              {HOME_APP_BANNER.eyebrow}
            </p>
            <h2
              id="dojo-director-app-heading"
              className="mt-4 text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              {HOME_APP_BANNER.title}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-300 sm:text-lg">
              {HOME_APP_BANNER.description}
            </p>
            <Link
              href={HOME_APP_BANNER.cta.href}
              className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-md bg-dojo-red px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-dojo-red/30 transition hover:bg-dojo-red-hover active:scale-[0.99] sm:text-base"
            >
              {HOME_APP_BANNER.cta.label}
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto flex w-full max-w-xs justify-center lg:mx-0 lg:ml-auto lg:max-w-sm lg:justify-end"
          >
            <div className="relative w-full max-w-[15rem] rounded-[2rem] border border-dojo-border/80 bg-dojo-surface p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:max-w-[16rem]">
              <div className="rounded-[1.5rem] bg-dojo-black px-4 pb-5 pt-8">
                <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-dojo-border" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-dojo-red shadow-lg shadow-dojo-red/30">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                    DD
                  </span>
                </div>
                <p className="mt-4 text-center text-sm font-semibold uppercase tracking-wide text-dojo-white">
                  Dojo Director
                </p>
                <div className="mt-5 space-y-2">
                  <div className="h-2 rounded-full bg-dojo-elevated" />
                  <div className="h-2 w-4/5 rounded-full bg-dojo-elevated" />
                  <div className="mt-4 h-10 rounded-xl bg-dojo-red/90" />
                  <div className="h-10 rounded-xl border border-dojo-border bg-dojo-surface" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
