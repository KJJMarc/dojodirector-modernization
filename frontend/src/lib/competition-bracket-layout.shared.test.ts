import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRACKET_PAGE_A4_LANDSCAPE,
  bracketSvgTextBaselineY,
  buildBracketLayout,
  getBracketLayoutVerticalBounds,
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

function buildBracketFromCount(count: number) {
  const names = Array.from({ length: count }, (_, index) => `Competitor ${index + 1}`);

  return buildCompetitionBracketFromForm({
    competitionName: "Competition Name",
    divisionName: "Bracket Name",
    scheduleTime: "10:00",
    notes: "1 minute. No subs allowed.",
    competitorsText: names.join("\n"),
  });
}

function assertBracketFitsPage(layout: ReturnType<typeof buildBracketLayout>) {
  const { minY, maxY } = getBracketLayoutVerticalBounds(layout);

  assert.ok(
    minY >= layout.bracketBottom - 1,
    `expected minY ${minY} to stay above bracket bottom ${layout.bracketBottom}`,
  );
  assert.ok(
    maxY <= layout.page.height - 8,
    `expected maxY ${maxY} to stay within page height ${layout.page.height}`,
  );
  assert.ok(
    maxY <= layout.bracketTop + 1,
    `expected maxY ${maxY} to stay within bracket top ${layout.bracketTop}`,
  );
}

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

for (const count of [4, 5, 8, 10, 12, 16]) {
  test(`${count}-competitor brackets fit on one landscape page`, async () => {
    const bracket = buildBracketFromCount(count);
    const layout = buildBracketLayout(bracket);

    if (count <= 16) {
      assert.equal(layout.page.width, BRACKET_PAGE_A4_LANDSCAPE.width);
      assert.equal(layout.page.height, BRACKET_PAGE_A4_LANDSCAPE.height);
    }

    assertBracketFitsPage(layout);

    const svg = renderBracketSvg(bracket);
    const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);

    assert.match(
      svg,
      new RegExp(
        `width="${layout.page.width}" height="${layout.page.height}"`,
      ),
    );
    assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");
  });
}

test("32-competitor brackets fit on one landscape A3 page", async () => {
  const bracket = buildBracketFromCount(32);
  const layout = buildBracketLayout(bracket);

  assert.ok(layout.page.width > BRACKET_PAGE_A4_LANDSCAPE.width);
  assertBracketFitsPage(layout);

  const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);
  assert.equal(Buffer.from(pdfBytes).subarray(0, 4).toString(), "%PDF");
});

test("larger brackets pack more first-round slots into the same height", () => {
  const smallLayout = buildBracketLayout(buildBracketFromCount(4));
  const largeLayout = buildBracketLayout(buildBracketFromCount(16));

  assert.ok(
    largeLayout.leafSlotHeight < smallLayout.leafSlotHeight,
    "denser brackets should allocate less height per first-round match",
  );
  assert.ok(
    largeLayout.nameFontSize <= smallLayout.nameFontSize,
    "denser brackets should never use a larger name font than sparse ones",
  );

  const smallAvailable = smallLayout.bracketTop - smallLayout.bracketBottom;
  const largeAvailable = largeLayout.bracketTop - largeLayout.bracketBottom;
  assert.equal(
    Math.round(smallAvailable),
    Math.round(largeAvailable),
    "the reserved header keeps the bracket area identical across sizes",
  );
});

test("all supported bracket sizes fit inside the printable area", () => {
  for (const count of [4, 5, 8, 10, 12, 16]) {
    const layout = buildBracketLayout(buildBracketFromCount(count));
    assertBracketFitsPage(layout);
  }
});
