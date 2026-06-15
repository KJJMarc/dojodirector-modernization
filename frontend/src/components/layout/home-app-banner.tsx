import Link from "next/link";
import { HOME_APP_BANNER } from "@/lib/home-platform-content";

export function HomeAppBanner() {
  return (
    <section
      id="dojo-director-app"
      aria-labelledby="dojo-director-app-heading"
      className="bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200/90 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-dojo-red sm:text-sm">
              {HOME_APP_BANNER.eyebrow}
            </p>
            <h2
              id="dojo-director-app-heading"
              className="mt-3 text-2xl font-semibold normal-case leading-tight tracking-tight text-neutral-950 sm:text-3xl"
            >
              {HOME_APP_BANNER.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-600 sm:mt-4 sm:text-lg">
              {HOME_APP_BANNER.description}
            </p>
          </div>

          <Link
            href={HOME_APP_BANNER.cta.href}
            className="inline-flex shrink-0 items-center justify-center self-start rounded-md bg-dojo-red px-7 py-3 text-sm font-semibold text-white transition hover:bg-dojo-red-hover active:scale-[0.99] lg:self-center"
          >
            {HOME_APP_BANNER.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
