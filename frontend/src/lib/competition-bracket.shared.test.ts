import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bracketSizeForCompetitorCount,
  buildCompetitionBracket,
  buildCompetitionBracketFromForm,
  formatBracketHeaderLine,
  hasByeVersusByeMatch,
  mainRoundLabelForMatchCount,
  parseCompetitorLines,
  planBracketStructure,
  preliminaryRoundLabel,
} from "@/lib/competition-bracket.shared";

test("bracketSizeForCompetitorCount pads to the next power of two", () => {
  assert.equal(bracketSizeForCompetitorCount(1), 2);
  assert.equal(bracketSizeForCompetitorCount(3), 4);
  assert.equal(bracketSizeForCompetitorCount(5), 8);
  assert.equal(bracketSizeForCompetitorCount(9), 16);
});

test("planBracketStructure uses preliminary matches instead of bye vs bye", () => {
  assert.deepEqual(planBracketStructure(5), {
    targetBracketSize: 8,
    preliminaryMatchCount: 1,
    byePlayerCount: 3,
    mainBracketEntrants: 4,
  });
  assert.deepEqual(planBracketStructure(6), {
    targetBracketSize: 8,
    preliminaryMatchCount: 2,
    byePlayerCount: 2,
    mainBracketEntrants: 4,
  });
});

test("buildCompetitionBracket for five competitors uses preliminary and semi-finals", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Grey Belt",
    competitors: ["A", "B", "C", "D", "E"],
    seedOrder: "entered",
  });

  assert.equal(bracket.preliminaryMatchCount, 1);
  assert.equal(bracket.mainBracketSize, 4);
  assert.equal(hasByeVersusByeMatch(bracket), false);
  assert.deepEqual(
    bracket.rounds.map((round) => round.label),
    ["Preliminary Round", "Semi-Final", "Final"],
  );

  const preliminary = bracket.rounds[0].matches;
  assert.equal(preliminary.length, 1);
  assert.equal(preliminary[0].top.source, "competitor");
  assert.equal(preliminary[0].bottom.source, "competitor");

  const semiFinals = bracket.rounds[1].matches;
  assert.equal(semiFinals.length, 2);

  const slots = semiFinals.flatMap((match) => [match.top, match.bottom]);
  const competitorSlots = slots.filter((slot) => slot.source === "competitor");
  const preliminaryWinnerSlots = slots.filter(
    (slot) => slot.source === "preliminary-winner",
  );
  const emptySlots = slots.filter((slot) => slot.source === "empty");

  // 3 byes advance directly, 1 slot awaits the single preliminary winner.
  assert.equal(competitorSlots.length, 3);
  assert.equal(preliminaryWinnerSlots.length, 1);
  assert.equal(emptySlots.length, 0);
});

test("buildCompetitionBracket for six competitors pairs preliminary winners with bye players", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Grey Belt",
    competitors: ["A", "B", "C", "D", "E", "F"],
    seedOrder: "entered",
  });

  assert.equal(bracket.preliminaryMatchCount, 2);
  assert.equal(bracket.rounds[0].matches.length, 2);
  assert.equal(bracket.rounds[1].label, "Semi-Final");

  const semiFinals = bracket.rounds[1].matches;
  const slots = semiFinals.flatMap((match) => [match.top, match.bottom]);
  assert.equal(
    slots.filter((slot) => slot.source === "competitor").length,
    2,
  );
  assert.equal(
    slots.filter((slot) => slot.source === "preliminary-winner").length,
    2,
  );
  assert.equal(hasByeVersusByeMatch(bracket), false);
});

test("buildCompetitionBracket for eight competitors has no preliminary round", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Blue Belt",
    competitors: ["A", "B", "C", "D", "E", "F", "G", "H"],
    seedOrder: "entered",
  });

  assert.equal(bracket.preliminaryMatchCount, 0);
  assert.equal(bracket.mainBracketSize, 8);
  assert.deepEqual(
    bracket.rounds.map((round) => round.label),
    ["Quarter-Final", "Semi-Final", "Final"],
  );
});

test("buildCompetitionBracket for four competitors uses semi-final and final", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "White Belt",
    competitors: ["A", "B", "C", "D"],
    seedOrder: "entered",
  });

  assert.deepEqual(
    bracket.rounds.map((round) => round.label),
    ["Semi-Final", "Final"],
  );
});

test("formatBracketHeaderLine keeps a labelled blank line for handwriting", () => {
  assert.equal(formatBracketHeaderLine("Time", ""), "Time: ");
  assert.equal(formatBracketHeaderLine("Time", "10:30am"), "Time: 10:30am");
  assert.equal(formatBracketHeaderLine("Notes", "Mats 1-2"), "Notes: Mats 1-2");
});

test("later rounds keep winner slots blank", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Grey Belt",
    competitors: ["A", "B", "C", "D"],
    seedOrder: "entered",
  });

  const semiFinal = bracket.rounds[0].matches[0];
  assert.equal(semiFinal.top.source, "competitor");
  assert.equal(semiFinal.bottom.source, "competitor");

  const final = bracket.rounds.at(-1)?.matches[0];
  assert.ok(final);
  assert.equal(final.top.source, "empty");
  assert.equal(final.bottom.source, "empty");
  assert.equal(final.top.name, "");
  assert.equal(final.bottom.name, "");
});

test("five competitor bracket keeps preliminary winner slot blank in semi-final", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Grey Belt",
    competitors: ["A", "B", "C", "D", "E"],
    seedOrder: "entered",
  });

  const semiFinals = bracket.rounds[1].matches;
  const preliminaryWinnerSlot = semiFinals
    .flatMap((match) => [match.top, match.bottom])
    .find((slot) => slot.source === "preliminary-winner");

  assert.ok(preliminaryWinnerSlot, "expected a preliminary-winner slot");
  assert.equal(preliminaryWinnerSlot.name, "");
});

test("parseCompetitorLines ignores blank lines in the textarea", () => {
  assert.deepEqual(parseCompetitorLines("Alex\n\nSam"), ["Alex", "Sam"]);
});

test("buildCompetitionBracketFromForm uses the entered division name", () => {
  const bracket = buildCompetitionBracketFromForm({
    competitionName: "Kids Open",
    divisionName: "Grey Belt Under 8",
    competitorsText: "Alex\nSam",
  });

  assert.equal(bracket.divisionName, "Grey Belt Under 8");
  assert.equal(bracket.rounds[0].matches[0].top.name, "Alex");
});

test("mainRoundLabelForMatchCount maps match counts to canonical labels", () => {
  assert.equal(mainRoundLabelForMatchCount(1), "Final");
  assert.equal(mainRoundLabelForMatchCount(2), "Semi-Final");
  assert.equal(mainRoundLabelForMatchCount(4), "Quarter-Final");
  assert.equal(mainRoundLabelForMatchCount(8), "Round of 16");
  assert.equal(preliminaryRoundLabel(), "Preliminary Round");
});

test("sixteen competitor bracket labels every column without repeating Final", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Blue Belt",
    competitors: Array.from({ length: 16 }, (_, index) => `C${index + 1}`),
    seedOrder: "entered",
  });

  const labels = bracket.rounds.map((round) => round.label);
  assert.deepEqual(labels, [
    "Round of 16",
    "Quarter-Final",
    "Semi-Final",
    "Final",
  ]);
  assert.equal(labels.filter((label) => label === "Final").length, 1);
});

const BRACKET_STRUCTURE_EXPECTATIONS = [
  { entrants: 5, preliminaryMatches: 1, byes: 3, mainSize: 4 },
  { entrants: 6, preliminaryMatches: 2, byes: 2, mainSize: 4 },
  { entrants: 7, preliminaryMatches: 3, byes: 1, mainSize: 4 },
  { entrants: 8, preliminaryMatches: 0, byes: 8, mainSize: 8 },
  { entrants: 9, preliminaryMatches: 1, byes: 7, mainSize: 8 },
  { entrants: 10, preliminaryMatches: 2, byes: 6, mainSize: 8 },
  { entrants: 12, preliminaryMatches: 4, byes: 4, mainSize: 8 },
  { entrants: 15, preliminaryMatches: 7, byes: 1, mainSize: 8 },
  { entrants: 16, preliminaryMatches: 0, byes: 16, mainSize: 16 },
] as const;

for (const expectation of BRACKET_STRUCTURE_EXPECTATIONS) {
  test(`${expectation.entrants} entrants award byes and play-ins correctly`, () => {
    const bracket = buildCompetitionBracketFromForm({
      competitionName: "Competition",
      divisionName: "Division",
      competitorsText: Array.from(
        { length: expectation.entrants },
        (_, index) => `Name ${index + 1}`,
      ).join("\n"),
    });

    assert.equal(
      bracket.preliminaryMatchCount,
      expectation.preliminaryMatches,
      "preliminary match count",
    );
    assert.equal(bracket.mainBracketSize, expectation.mainSize, "main size");

    // Every preliminary match must have two real competitors — never a bye.
    for (const match of bracket.rounds
      .filter((round) => round.isPreliminary)
      .flatMap((round) => round.matches)) {
      assert.equal(match.top.source, "competitor");
      assert.equal(match.bottom.source, "competitor");
    }

    // The first main round has exactly `mainSize / 2` matches (a power of two)
    // and awards the expected number of byes as real competitors.
    const firstMainRoundIndex = bracket.preliminaryMatchCount > 0 ? 1 : 0;
    const firstMainRound = bracket.rounds.find(
      (round) => !round.isPreliminary && round.roundIndex === firstMainRoundIndex,
    );
    assert.ok(firstMainRound, "expected a first main round");
    assert.equal(firstMainRound.matches.length, expectation.mainSize / 2);

    const firstMainSlots = firstMainRound.matches.flatMap((match) => [
      match.top,
      match.bottom,
    ]);
    assert.equal(
      firstMainSlots.filter((slot) => slot.source === "competitor").length,
      expectation.byes,
      "bye competitors placed in the first main round",
    );
    assert.equal(
      firstMainSlots.filter((slot) => slot.source === "empty").length,
      0,
      "no phantom empty slots in the first main round",
    );

    assert.equal(hasByeVersusByeMatch(bracket), false, "no BYE vs BYE");

    const finals = bracket.rounds.filter((round) => round.label === "Final");
    assert.equal(finals.length, 1, "exactly one Final");
  });
}

test("round headings never repeat Final across supported sizes", () => {
  for (const count of [4, 5, 8, 10, 12, 16]) {
    const bracket = buildCompetitionBracketFromForm({
      competitionName: "Competition",
      divisionName: "Division",
      competitorsText: Array.from(
        { length: count },
        (_, index) => `Name ${index + 1}`,
      ).join("\n"),
    });

    const finals = bracket.rounds.filter((round) => round.label === "Final");
    assert.equal(
      finals.length,
      1,
      `expected exactly one Final column for ${count} competitors`,
    );
    assert.equal(bracket.rounds.at(-1)?.label, "Final");
  }
});
