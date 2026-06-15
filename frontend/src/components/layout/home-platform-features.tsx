import {
  HOME_PLATFORM_CATEGORIES,
  HOME_PLATFORM_OVERVIEW,
} from "@/lib/home-platform-content";

function HomePlatformCategoryPanel({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: readonly string[];
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-dojo-border/70 bg-dojo-surface/50 p-6 sm:p-7">
      <div className="mb-4 h-1 w-12 rounded-full bg-dojo-red" />
      <h3 className="text-xl font-semibold text-dojo-white sm:text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-dojo-muted sm:text-base">
        {description}
      </p>
      <ul className="mt-5 space-y-2.5">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-3 text-sm leading-relaxed text-dojo-white/90 sm:text-[0.9375rem]"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dojo-red"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),_transparent_50%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-10 max-w-2xl">
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

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {HOME_PLATFORM_CATEGORIES.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-24">
              <HomePlatformCategoryPanel
                title={category.title}
                description={category.description}
                bullets={category.bullets}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
