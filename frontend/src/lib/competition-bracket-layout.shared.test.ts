import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bracketSvgTextBaselineY,
  buildBracketLayout,
} from "@/lib/competition-bracket-layout.shared";
import { buildCompetitionBracketFromForm } from "@/lib/competition-bracket.shared";
import { buildCompetitionBracketPdfBytes } from "@/lib/competition-bracket-pdf.shared";
import { renderBracketSvg } from "@/lib/competition-bracket-svg.shared";

const EIGHT_PERSON_BRACKET_INPUT = {
  competitionName: "Competition Name",
  divisionName: "Bracket Name",
  scheduleTime: "10:00",
  notes: "1 minute. No subs allowed.",
  competitorsText: [
    "Devon Everard",
    "Tyler Thwaits",
    "Caoimhe Jankes",
    "Jad Halabi",
    "Romaisa Sajid",
    "Harvey Cochran",
    "Taeyung Kim",
    "Reign Smallin",
  ].join("\n"),
};

test("competitor names sit above entry lines with shared layout spacing", () => {
  const bracket = buildCompetitionBracketFromForm(EIGHT_PERSON_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);
  const firstRound = layout.rounds[0];

  for (const match of firstRound.matches) {
    assert.equal(
      match.topTextBaselineY - match.topY,
      layout.competitorNameLineGap,
    );
    assert.equal(
      match.bottomTextBaselineY - match.bottomY,
      layout.competitorNameLineGap,
    );
    assert.ok(match.topTextBaselineY > match.topY);
    assert.ok(match.bottomTextBaselineY > match.bottomY);
  }
});

test("only the opening bracket round displays competitor names", () => {
  const bracket = buildCompetitionBracketFromForm(EIGHT_PERSON_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);

  assert.equal(layout.rounds.length, 3);
  assert.equal(layout.rounds[0].label, "Quarter-Final");

  for (const match of layout.rounds[0].matches) {
    assert.ok(match.topLabel.length > 0);
    assert.ok(match.bottomLabel.length > 0);
  }

  for (const round of layout.rounds.slice(1)) {
    for (const match of round.matches) {
      assert.equal(match.topLabel, "");
      assert.equal(match.bottomLabel, "");
    }
  }
});

test("svg and pdf share the same page dimensions for an 8-person bracket", async () => {
  const bracket = buildCompetitionBracketFromForm(EIGHT_PERSON_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);
  const svg = renderBracketSvg(bracket);
  const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);

  assert.match(
    svg,
    new RegExp(
      `width="${layout.page.width}" height="${layout.page.height}"`,
    ),
  );
  assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");
  assert.ok(pdfBytes.length > 1_000);
});

test("svg competitor text uses the same baseline coordinates as pdf layout", () => {
  const bracket = buildCompetitionBracketFromForm(EIGHT_PERSON_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);
  const svg = renderBracketSvg(bracket);
  const match = layout.rounds[0].matches[0];
  const expectedTopTextY = bracketSvgTextBaselineY(
    match.topTextBaselineY,
    layout.page.height,
  );

  assert.match(
    svg,
    new RegExp(
      `<text x="${match.nameLineStartX}" y="${expectedTopTextY}"`,
    ),
  );
  assert.match(
    svg,
    new RegExp(
      `y1="${bracketSvgTextBaselineY(match.topY, layout.page.height)}"`,
    ),
  );
});
