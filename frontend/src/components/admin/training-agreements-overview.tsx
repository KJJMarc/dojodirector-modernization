import Link from "next/link";
import { clubAgreementTypeLabel } from "@/lib/club-agreement-templates.shared";
import type { TrainingAgreementAdminCard } from "@/lib/club-agreement-templates.server";

interface TrainingAgreementsOverviewProps {
  cards: TrainingAgreementAdminCard[];
}

function formatLastUpdated(value: string | null) {
  if (!value) {
    return "Built-in default (v1.0)";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TrainingAgreementsOverview({ cards }: TrainingAgreementsOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <section
          key={card.agreementType}
          className="flex flex-col justify-between rounded-xl border border-dojo-border bg-dojo-surface p-4"
        >
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-dojo-white">
              {clubAgreementTypeLabel(card.agreementType)}
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                  Title
                </dt>
                <dd className="text-dojo-white">{card.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                  Active version
                </dt>
                <dd className="text-dojo-white">v{card.activeVersion}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                  Last updated
                </dt>
                <dd className="text-dojo-muted">
                  {formatLastUpdated(card.lastUpdated)}
                </dd>
              </div>
            </dl>
            {!card.isCustomTemplate ? (
              <p className="text-xs text-dojo-muted">
                Using the built-in v1.0 agreement text until you save a club template.
              </p>
            ) : null}
          </div>
          <Link
            href={card.editHref}
            className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:bg-dojo-elevated"
          >
            Edit
          </Link>
        </section>
      ))}
    </div>
  );
}
