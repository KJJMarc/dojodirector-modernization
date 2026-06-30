import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { buildBracketLayout } from "@/lib/competition-bracket-layout.shared";
import { buildCompetitionBracketFromForm } from "@/lib/competition-bracket.shared";
import { buildCompetitionBracketPdfBytes } from "@/lib/competition-bracket-pdf.shared";

const SAMPLE_BRACKET_INPUT = {
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

test("buildCompetitionBracketPdfBytes produces a readable landscape PDF", async () => {
  const bracket = buildCompetitionBracketFromForm(SAMPLE_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);
  const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);

  assert.ok(pdfBytes.length > 1_000);
  assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");

  const pdf = await PDFDocument.load(pdfBytes);
  assert.equal(pdf.getPageCount(), 1);

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  assert.equal(width, layout.page.width);
  assert.equal(height, layout.page.height);
  assert.ok(width > height);
});

test("buildCompetitionBracketPdfBytes keeps competitor text above entry lines", async () => {
  const bracket = buildCompetitionBracketFromForm(SAMPLE_BRACKET_INPUT);
  const layout = buildBracketLayout(bracket);
  const firstRound = layout.rounds[0];

  for (const match of firstRound.matches) {
    assert.ok(match.topTextBaselineY > match.topY);
    assert.ok(match.bottomTextBaselineY > match.bottomY);
    assert.equal(
      match.topTextBaselineY - match.topY,
      layout.competitorNameLineGap,
    );
  }

  const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);
  assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");
});

test("buildCompetitionBracketPdfBytes handles apostrophes, ampersands and angle brackets", async () => {
  const bracket = buildCompetitionBracketFromForm({
    competitionName: "Tom O'Connor",
    divisionName: "Smith & Jones",
    scheduleTime: "10:30am",
    notes: "1 minute <no subs> & golden score",
    competitorsText:
      "Tom O'Connor\nSmith & Jones\nMia Patel\nSam Wilson",
  });

  const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);

  assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");
  assert.ok(pdfBytes.length > 1_000);
});
