import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bracketSizeForCompetitorCount,
  buildCompetitionBracket,
  parseCompetitorGroups,
  roundLabelForIndex,
} from "@/lib/competition-bracket.shared";

test("bracketSizeForCompetitorCount pads to the next power of two", () => {
  assert.equal(bracketSizeForCompetitorCount(1), 2);
  assert.equal(bracketSizeForCompetitorCount(3), 4);
  assert.equal(bracketSizeForCompetitorCount(5), 8);
  assert.equal(bracketSizeForCompetitorCount(9), 16);
});

test("buildCompetitionBracket adds byes and advances single competitors", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Grey Belt",
    competitors: ["Alex Smith"],
    seedOrder: "entered",
  });

  assert.equal(bracket.bracketSize, 2);
  assert.equal(bracket.rounds.length, 1);
  assert.equal(bracket.rounds[0].label, "Final");
  assert.equal(bracket.rounds[0].matches[0].top.name, "Alex Smith");
  assert.equal(bracket.rounds[0].matches[0].bottom.isBye, true);
  assert.equal(bracket.rounds[0].matches[0].winnerName, "Alex Smith");
});

test("buildCompetitionBracket creates quarter, semi, and final rounds for eight competitors", () => {
  const bracket = buildCompetitionBracket({
    competitionName: "Kids Open",
    divisionName: "Blue Belt",
    competitors: [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
    ],
    seedOrder: "entered",
  });

  assert.equal(bracket.bracketSize, 8);
  assert.deepEqual(
    bracket.rounds.map((round) => round.label),
    ["Round 1", "Semi Final", "Final"],
  );
  assert.equal(bracket.rounds[0].matches.length, 4);
  assert.equal(bracket.rounds[1].matches.length, 2);
  assert.equal(bracket.rounds[2].matches.length, 1);
});

test("parseCompetitorGroups splits blank-line separated divisions", () => {
  const groups = parseCompetitorGroups(
    "Alex\nSam\n\nMia\nNoah",
    "Gi Division",
    true,
  );

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].competitors, ["Alex", "Sam"]);
  assert.deepEqual(groups[1].competitors, ["Mia", "Noah"]);
  assert.equal(groups[0].divisionName, "Gi Division 1");
  assert.equal(groups[1].divisionName, "Gi Division 2");
});

test("roundLabelForIndex names late rounds consistently", () => {
  assert.equal(roundLabelForIndex(0, 3), "Round 1");
  assert.equal(roundLabelForIndex(1, 3), "Semi Final");
  assert.equal(roundLabelForIndex(2, 4), "Semi Final");
  assert.equal(roundLabelForIndex(3, 4), "Final");
  assert.equal(roundLabelForIndex(1, 5), "Round 2");
  assert.equal(roundLabelForIndex(2, 5), "Quarter Final");
});
