import Image from "next/image";
import Link from "next/link";
import { HOME_APP_BANNER } from "@/lib/home-platform-content";
import { PWA_ICON_PATHS, PWA_NAME } from "@/lib/pwa.shared";

export function HomeAppBanner() {
  return (
    <section
      id="dojo-director-app"
      aria-labelledby="dojo-director-app-heading"
      className="bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8"
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

        <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-6 lg:p-8">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dojo-red sm:text-sm">
              {HOME_APP_BANNER.eyebrow}
            </p>
            <h2
              id="dojo-director-app-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              {HOME_APP_BANNER.title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-300 sm:text-base">
              {HOME_APP_BANNER.description}
            </p>
            <Link
              href={HOME_APP_BANNER.cta.href}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-dojo-red px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-dojo-red/30 transition hover:bg-dojo-red-hover active:scale-[0.99]"
            >
              {HOME_APP_BANNER.cta.label}
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto flex w-full max-w-xs justify-center lg:mx-0 lg:ml-auto lg:max-w-sm lg:justify-end"
          >
            <div className="relative w-full max-w-[13.5rem] rounded-[2rem] border border-dojo-border/80 bg-dojo-surface p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:max-w-[14rem]">
              <div className="rounded-[1.5rem] bg-dojo-black px-4 pb-4 pt-6">
                <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-dojo-border" />
                <div className="mx-auto flex h-[4.25rem] w-[4.25rem] items-center justify-center">
                  <Image
                    src={PWA_ICON_PATHS.icon192}
                    alt=""
                    width={68}
                    height={68}
                    className="h-[4.25rem] w-[4.25rem] rounded-[1rem] object-contain"
                  />
                </div>
                <p className="mt-3 text-center text-sm font-semibold tracking-wide text-dojo-white">
                  {PWA_NAME}
                </p>
                <div className="mt-4 space-y-2">
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
