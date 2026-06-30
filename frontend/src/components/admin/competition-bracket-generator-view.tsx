"use client";

import { useMemo, useState, useTransition } from "react";
import { competitionBracketPdfApiPath } from "@/lib/admin-competition-bracket.shared";
import {
  buildCompetitionBracketsFromForm,
  sanitizeBracketFilenamePart,
  type CompetitionBracket,
  type SeedOrderMode,
} from "@/lib/competition-bracket.shared";
import { renderBracketSvg } from "@/lib/competition-bracket-svg.shared";

interface CompetitionBracketGeneratorViewProps {
  clubSlug: string;
}

const INPUT_CLASS =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted focus:border-dojo-red/60 focus:outline-none";

const BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:cursor-not-allowed disabled:opacity-50";

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
        className="mx-auto min-w-[720px]"
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
  const [competitorsText, setCompetitorsText] = useState("");
  const [seedOrder, setSeedOrder] = useState<SeedOrderMode>("entered");
  const [multipleBrackets, setMultipleBrackets] = useState(false);
  const [selectedBracketIndex, setSelectedBracketIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const brackets = useMemo(
    () =>
      buildCompetitionBracketsFromForm({
        competitionName,
        divisionName,
        competitorsText,
        seedOrder,
        multipleBrackets,
      }),
    [
      competitionName,
      divisionName,
      competitorsText,
      seedOrder,
      multipleBrackets,
    ],
  );

  const activeBracket =
    brackets[selectedBracketIndex] ?? brackets[0] ?? null;
  const competitorCount = competitorsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  const hasCompetitors = competitorCount > 0;

  const buildPayload = (mode: "single" | "all") => ({
    competitionName,
    divisionName,
    competitorsText,
    seedOrder,
    multipleBrackets,
    mode,
    bracketIndex: selectedBracketIndex,
  });

  const handleDownload = (mode: "single" | "all") => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const competitionPart =
          sanitizeBracketFilenamePart(competitionName) || "competition";
        const divisionPart =
          sanitizeBracketFilenamePart(
            mode === "single"
              ? activeBracket?.divisionName ?? divisionName
              : divisionName,
          ) || "bracket";
        const filename =
          mode === "all"
            ? `${competitionPart}-all-brackets.pdf`
            : `${competitionPart}-${divisionPart}.pdf`;

        await downloadPdfFromApi({
          clubSlug,
          payload: buildPayload(mode),
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
                placeholder="Kingston Kids Open 2026"
                className={INPUT_CLASS}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-dojo-white">
                Bracket / division name
              </span>
              <input
                type="text"
                value={divisionName}
                onChange={(event) => setDivisionName(event.target.value)}
                placeholder="Grey Belt Under 8"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-dojo-white">
              Competitor names
            </span>
            <span className="block text-xs text-dojo-muted">
              One name per line. Separate groups with a blank line to create
              multiple brackets.
            </span>
            <textarea
              value={competitorsText}
              onChange={(event) => setCompetitorsText(event.target.value)}
              rows={12}
              placeholder={"Alex Smith\nFreya Jones\n\nMia Patel\nSam Wilson"}
              className={`${INPUT_CLASS} min-h-[220px] font-mono`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-dojo-white">
                Seed order
              </legend>
              <label className="flex items-center gap-2 text-sm text-dojo-muted">
                <input
                  type="radio"
                  name="seedOrder"
                  checked={seedOrder === "entered"}
                  onChange={() => setSeedOrder("entered")}
                />
                Keep entered order
              </label>
              <label className="flex items-center gap-2 text-sm text-dojo-muted">
                <input
                  type="radio"
                  name="seedOrder"
                  checked={seedOrder === "shuffle"}
                  onChange={() => setSeedOrder("shuffle")}
                />
                Shuffle competitors
              </label>
            </fieldset>

            <label className="flex items-start gap-2 text-sm text-dojo-muted">
              <input
                type="checkbox"
                checked={multipleBrackets}
                onChange={(event) => setMultipleBrackets(event.target.checked)}
                className="mt-1"
              />
              <span>
                Generate multiple brackets from blank-line groups. Division names
                will be numbered automatically when more than one group is found.
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-dojo-white">Preview</h2>
            <p className="text-xs text-dojo-muted">
              Black-and-white landscape knockout layout with blank winner lines.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              disabled={!hasCompetitors || isPending}
              onClick={() => handleDownload("single")}
            >
              {isPending ? "Generating…" : "Generate PDF"}
            </button>
            {brackets.length > 1 ? (
              <button
                type="button"
                className={BUTTON_CLASS}
                disabled={!hasCompetitors || isPending}
                onClick={() => handleDownload("all")}
              >
                Download all brackets
              </button>
            ) : null}
          </div>
        </div>

        {brackets.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {brackets.map((bracket, index) => (
              <button
                key={`${bracket.divisionName}-${index}`}
                type="button"
                onClick={() => setSelectedBracketIndex(index)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedBracketIndex === index
                    ? "border-dojo-red bg-dojo-red/20 text-dojo-white"
                    : "border-dojo-border bg-dojo-elevated text-dojo-muted hover:text-dojo-white"
                }`}
              >
                {bracket.divisionName} ({bracket.mainBracketSize})
              </button>
            ))}
          </div>
        ) : null}

        {!hasCompetitors ? (
          <p className="text-sm text-dojo-muted">
            Enter at least one competitor name to preview the bracket.
          </p>
        ) : activeBracket ? (
          <BracketPreview bracket={activeBracket} />
        ) : null}

        {errorMessage ? (
          <p className="mt-3 text-sm text-dojo-red" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
