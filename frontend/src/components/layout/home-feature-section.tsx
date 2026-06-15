import Link from "next/link";
import type { HomeFeatureCard } from "@/lib/home-platform-content";

interface HomeFeatureSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  features: HomeFeatureCard[];
}

export function HomeFeatureSection({
  id,
  eyebrow,
  title,
  description,
  features,
}: HomeFeatureSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="relative overflow-hidden border-t border-dojo-border/40 bg-gradient-to-br from-neutral-950 via-dojo-black to-neutral-900 py-14 sm:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.12),_transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            {eyebrow}
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-2 text-2xl font-semibold text-white sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base">
            {description}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-xl border border-dojo-border/80 bg-dojo-surface/90 p-5 shadow-lg shadow-black/20 transition hover:border-dojo-red/40 sm:p-6"
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
  );
}
