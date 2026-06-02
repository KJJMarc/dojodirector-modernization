import {
  getAcademyPublicPagesForClub,
  type AcademyPublicPageDefinition,
} from "@/lib/admin-academy-pages.shared";

interface AcademyPagesOverviewProps {
  clubSlug: string;
}

const viewPageButtonClassName =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

function AcademyPageCard({
  page,
  href,
}: {
  page: AcademyPublicPageDefinition;
  href: string;
}) {
  return (
    <article className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-dojo-white">{page.name}</h3>
          <p className="text-sm leading-relaxed text-dojo-muted">{page.description}</p>
          <p className="font-mono text-xs text-dojo-muted">{page.pathLabel}</p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={viewPageButtonClassName}
        >
          View Page
        </a>
      </div>
    </article>
  );
}

export function AcademyPagesOverview({ clubSlug }: AcademyPagesOverviewProps) {
  const pages = getAcademyPublicPagesForClub(clubSlug);

  return (
    <div className="space-y-3">
      {pages.map((page) => (
        <AcademyPageCard key={page.id} page={page} href={page.href} />
      ))}
    </div>
  );
}
