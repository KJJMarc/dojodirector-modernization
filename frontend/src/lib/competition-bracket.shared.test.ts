import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bracketSizeForCompetitorCount,
  buildCompetitionBracket,
  buildCompetitionBracketFromForm,
  formatBracketHeaderLine,
  hasByeVersusByeMatch,
  mainRoundLabel,
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

  const preliminary = bracket.rounds[0].matches[0];
  assert.deepEqual(
    [preliminary.top.name, preliminary.bottom.name],
    ["D", "E"],
  );

  const semiFinals = bracket.rounds[1].matches;
  assert.equal(semiFinals.length, 2);
  assert.equal(semiFinals[0].top.source, "preliminary-winner");
  assert.equal(semiFinals[0].bottom.name, "A");
  assert.equal(semiFinals[1].top.name, "B");
  assert.equal(semiFinals[1].bottom.name, "C");
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
  assert.equal(bracket.rounds[1].matches[0].bottom.name, "A");
  assert.equal(bracket.rounds[1].matches[1].bottom.name, "B");
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
  assert.equal(semiFinals[0].top.source, "preliminary-winner");
  assert.equal(semiFinals[0].top.name, "");
  assert.equal(semiFinals[0].bottom.source, "competitor");
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

test("mainRoundLabel uses hyphenated round names", () => {
  assert.equal(mainRoundLabel(0, 4), "Semi-Final");
  assert.equal(mainRoundLabel(1, 4), "Final");
  assert.equal(mainRoundLabel(0, 8), "Quarter-Final");
  assert.equal(mainRoundLabel(1, 8), "Semi-Final");
  assert.equal(preliminaryRoundLabel(), "Preliminary Round");
});
