import Image from "next/image";
import Link from "next/link";
import { HOME_APP_BANNER } from "@/lib/home-platform-content";
import { PWA_ICON_PATHS, PWA_NAME } from "@/lib/pwa.shared";

function AppBannerMockup() {
  return (
    <div className="relative w-[10.5rem] rounded-[1.75rem] border border-dojo-border/80 bg-dojo-surface p-2 shadow-[0_16px_48px_rgba(0,0,0,0.4)] xl:w-[11rem]">
      <div className="rounded-[1.25rem] bg-dojo-black px-3 pb-3 pt-5">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-dojo-border" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center">
          <Image
            src={PWA_ICON_PATHS.icon192}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-[0.875rem] object-contain"
          />
        </div>
        <p className="mt-2 text-center text-xs font-semibold tracking-wide text-dojo-white">
          {PWA_NAME}
        </p>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 rounded-full bg-dojo-elevated" />
          <div className="h-1.5 w-4/5 rounded-full bg-dojo-elevated" />
          <div className="mt-2.5 h-8 rounded-lg bg-dojo-red/90" />
          <div className="h-8 rounded-lg border border-dojo-border bg-dojo-surface" />
        </div>
      </div>
    </div>
  );
}

export function HomeAppBanner() {
  return (
    <section
      id="dojo-director-app"
      aria-labelledby="dojo-director-app-heading"
      className="bg-neutral-50 px-4 py-4 sm:px-6 sm:py-6"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-dojo-red/25 bg-gradient-to-br from-neutral-950 via-dojo-black to-neutral-900 shadow-xl shadow-black/25 lg:rounded-3xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-dojo-red/15 blur-3xl lg:-right-12 lg:-top-12 lg:h-40 lg:w-40 lg:bg-dojo-red/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-dojo-red/50 to-transparent"
        />

        <div className="relative flex flex-col p-4 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:p-6 xl:gap-7">
          <div className="max-w-lg">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-dojo-red sm:text-xs">
              {HOME_APP_BANNER.eyebrow}
            </p>
            <h2
              id="dojo-director-app-heading"
              className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:mt-2 sm:text-2xl"
            >
              {HOME_APP_BANNER.title}
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-neutral-300 sm:mt-2">
              {HOME_APP_BANNER.description}
            </p>
            <Link
              href={HOME_APP_BANNER.cta.href}
              className="mt-3 inline-flex min-h-[42px] items-center justify-center rounded-md bg-dojo-red px-5 py-2 text-sm font-semibold text-white shadow-md shadow-dojo-red/25 transition hover:bg-dojo-red-hover active:scale-[0.99] sm:mt-4"
            >
              {HOME_APP_BANNER.cta.label}
            </Link>
          </div>

          <div aria-hidden="true" className="hidden shrink-0 lg:flex lg:justify-end">
            <AppBannerMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
