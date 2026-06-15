import type { HomePlatformSection } from "@/lib/home-platform-content";
import { HOME_PLATFORM_OVERVIEW, HOME_PLATFORM_SECTIONS } from "@/lib/home-platform-content";

function HomeFeatureCategory({
  section,
}: {
  section: HomePlatformSection;
}) {
  return (
    <div className="scroll-mt-24" id={section.id}>
      <div className="mb-5 flex flex-col gap-2 border-b border-dojo-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dojo-red">
            {section.eyebrow}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            {section.title}
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-dojo-muted sm:text-right">
          {section.description}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
        {section.features.map((feature) => (
          <li
            key={feature.title}
            className="rounded-xl border border-dojo-border/70 bg-dojo-surface/80 px-4 py-4 transition hover:border-dojo-red/35 hover:bg-dojo-surface sm:px-5 sm:py-5"
          >
            <h4 className="text-base font-semibold text-dojo-white">
              {feature.title}
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-dojo-muted">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomePlatformFeatures() {
  return (
    <section
      id="platform"
      aria-labelledby="platform-heading"
      className="relative overflow-hidden border-t border-dojo-border/40 bg-gradient-to-b from-neutral-950 via-dojo-black to-neutral-950 py-14 sm:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.14),_transparent_50%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            {HOME_PLATFORM_OVERVIEW.eyebrow}
          </p>
          <h2
            id="platform-heading"
            className="mt-2 text-3xl font-semibold text-white sm:text-4xl"
          >
            {HOME_PLATFORM_OVERVIEW.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base">
            {HOME_PLATFORM_OVERVIEW.description}
          </p>
        </header>

        <div className="space-y-12 sm:space-y-14">
          {HOME_PLATFORM_SECTIONS.map((section) => (
            <HomeFeatureCategory key={section.id} section={section} />
          ))}
        </div>
      </div>
    </section>
  );
}
