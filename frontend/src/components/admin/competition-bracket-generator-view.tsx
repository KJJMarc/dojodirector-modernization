"use client";

import { useMemo, useState, useTransition } from "react";
import { competitionBracketPdfApiPath } from "@/lib/admin-competition-bracket.shared";
import {
  buildCompetitionBracketFromForm,
  sanitizeBracketFilenamePart,
  type CompetitionBracket,
} from "@/lib/competition-bracket.shared";
import { renderBracketSvg } from "@/lib/competition-bracket-svg.shared";

interface CompetitionBracketGeneratorViewProps {
  clubSlug: string;
}

const INPUT_CLASS =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted focus:border-dojo-red/60 focus:outline-none";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-dojo-red/50 bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-50";

async function downloadPdfFromApi(input: {
  clubSlug: string;
  payload: Record<string, unknown>;
  filename: string;
}) {
  const response = await fetch(competitionBracketPdfApiPath(input.clubSlug), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(errorBody?.error ?? "Unable to generate bracket PDF.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BracketPreview({ bracket }: { bracket: CompetitionBracket }) {
  const svg = useMemo(() => renderBracketSvg(bracket), [bracket]);

  return (
    <div className="overflow-x-auto rounded-lg border border-dojo-border bg-white p-2">
      <div
        className="mx-auto w-full min-w-[720px] max-w-full [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export function CompetitionBracketGeneratorView({
  clubSlug,
}: CompetitionBracketGeneratorViewProps) {
  const [competitionName, setCompetitionName] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [notes, setNotes] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bracket = useMemo(
    () =>
      buildCompetitionBracketFromForm({
        competitionName,
        divisionName,
        scheduleTime,
        notes,
        competitorsText,
      }),
    [competitionName, divisionName, scheduleTime, notes, competitorsText],
  );

  const competitorCount = competitorsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  const hasCompetitors = competitorCount > 0;

  const handleDownload = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const competitionPart =
          sanitizeBracketFilenamePart(competitionName) || "competition";
        const divisionPart =
          sanitizeBracketFilenamePart(divisionName) || "bracket";
        const filename = `${competitionPart}-${divisionPart}.pdf`;

        await downloadPdfFromApi({
          clubSlug,
          payload: {
            competitionName,
            divisionName,
            scheduleTime,
            notes,
            competitorsText,
          },
          filename,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to generate bracket PDF.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4 sm:p-5">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-dojo-white">
                Competition name
              </span>
              <input
                type="text"
                value={competitionName}
                onChange={(event) => setCompetitionName(event.target.value)}
                placeholder="Competition Name"
                className={INPUT_CLASS}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-dojo-white">
                Bracket name
              </span>
              <input
                type="text"
                value={divisionName}
                onChange={(event) => setDivisionName(event.target.value)}
                placeholder="Bracket Name"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-dojo-white">
              Competitor names
            </span>
            <span className="block text-xs text-dojo-muted">
              One name per line.
            </span>
            <textarea
              value={competitorsText}
              onChange={(event) => setCompetitorsText(event.target.value)}
              rows={12}
              placeholder={"Alex Smith\nFreya Jones\nMia Patel\nSam Wilson"}
              className={`${INPUT_CLASS} min-h-[220px] font-mono`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-dojo-white">Time</span>
              <input
                type="text"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                placeholder="10:30am"
                className={INPUT_CLASS}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-dojo-white">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Mats 1-2. Gi division."
                className={INPUT_CLASS}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-dojo-white">Preview</h2>

          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={!hasCompetitors || isPending}
            onClick={handleDownload}
          >
            {isPending ? "Generating…" : "Generate PDF"}
          </button>
        </div>

        {!hasCompetitors ? (
          <p className="text-sm text-dojo-muted">
            Enter at least one competitor name to preview the bracket.
          </p>
        ) : (
          <BracketPreview bracket={bracket} />
        )}

        {errorMessage ? (
          <p className="mt-3 text-sm text-dojo-red" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
