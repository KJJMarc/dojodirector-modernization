export type SeedOrderMode = "entered" | "shuffle";

export interface BracketBuildInput {
  competitionName: string;
  divisionName: string;
  competitors: string[];
  seedOrder?: SeedOrderMode;
}

export interface BracketParticipant {
  name: string;
  isBye: boolean;
}

export interface BracketMatch {
  matchNumber: number;
  roundIndex: number;
  matchIndex: number;
  top: BracketParticipant;
  bottom: BracketParticipant;
  /** Pre-filled when a bye advances; otherwise blank for handwriting. */
  winnerName: string;
}

export interface BracketRound {
  label: string;
  roundIndex: number;
  matches: BracketMatch[];
}

export interface CompetitionBracket {
  competitionName: string;
  divisionName: string;
  bracketSize: number;
  rounds: BracketRound[];
}

export interface ParsedBracketGroup {
  divisionName: string;
  competitors: string[];
}

export function parseCompetitorLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCompetitorGroups(
  text: string,
  defaultDivisionName: string,
  multipleBrackets: boolean,
): ParsedBracketGroup[] {
  const divisionBase = defaultDivisionName.trim() || "Division";

  if (!multipleBrackets) {
    const competitors = parseCompetitorLines(text);
    return [{ divisionName: divisionBase, competitors }];
  }

  const groups = text
    .split(/\n\s*\n/)
    .map((group) => group.trim())
    .filter(Boolean);

  if (groups.length === 0) {
    return [{ divisionName: divisionBase, competitors: [] }];
  }

  return groups.map((group, index) => ({
    divisionName:
      groups.length > 1 ? `${divisionBase} ${index + 1}`.trim() : divisionBase,
    competitors: parseCompetitorLines(group),
  }));
}

export function bracketSizeForCompetitorCount(count: number): number {
  const competitorCount = Math.max(count, 1);
  let size = 1;

  while (size < competitorCount) {
    size *= 2;
  }

  return Math.max(size, 2);
}

export function shuffleCompetitors(names: string[]): string[] {
  const shuffled = [...names];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function participantFromSlot(
  slot: BracketParticipant | null,
): BracketParticipant {
  return slot ?? { name: "", isBye: false };
}

function byeAdvanceWinner(
  top: BracketParticipant,
  bottom: BracketParticipant,
): string {
  if (top.isBye && bottom.isBye) {
    return "";
  }

  if (top.isBye && !bottom.isBye) {
    return bottom.name;
  }

  if (bottom.isBye && !top.isBye) {
    return top.name;
  }

  return "";
}

function buildFirstRoundParticipants(
  competitors: string[],
  bracketSize: number,
): BracketParticipant[] {
  const slots: BracketParticipant[] = competitors.map((name) => ({
    name,
    isBye: false,
  }));

  while (slots.length < bracketSize) {
    slots.push({ name: "BYE", isBye: true });
  }

  return slots;
}

export function roundLabelForIndex(
  roundIndex: number,
  totalRounds: number,
): string {
  const roundsRemaining = totalRounds - roundIndex;

  if (roundsRemaining <= 1) {
    return "Final";
  }

  if (roundsRemaining === 2) {
    return totalRounds === 2 ? "Round 1" : "Semi Final";
  }

  if (roundsRemaining === 3) {
    return totalRounds >= 4 ? "Quarter Final" : "Round 1";
  }

  return `Round ${roundIndex + 1}`;
}

export function buildCompetitionBracket(
  input: BracketBuildInput,
): CompetitionBracket {
  const seedOrder = input.seedOrder ?? "entered";
  const orderedNames =
    seedOrder === "shuffle"
      ? shuffleCompetitors(input.competitors)
      : [...input.competitors];
  const bracketSize = bracketSizeForCompetitorCount(orderedNames.length);
  const totalRounds = Math.log2(bracketSize);
  const firstRoundParticipants = buildFirstRoundParticipants(
    orderedNames,
    bracketSize,
  );

  const rounds: BracketRound[] = [];
  let matchNumber = 1;

  const firstRoundMatches: BracketMatch[] = [];

  for (let matchIndex = 0; matchIndex < bracketSize / 2; matchIndex += 1) {
    const top = firstRoundParticipants[matchIndex * 2];
    const bottom = firstRoundParticipants[matchIndex * 2 + 1];

    firstRoundMatches.push({
      matchNumber: matchNumber,
      roundIndex: 0,
      matchIndex,
      top,
      bottom,
      winnerName: byeAdvanceWinner(top, bottom),
    });
    matchNumber += 1;
  }

  rounds.push({
    label: roundLabelForIndex(0, totalRounds),
    roundIndex: 0,
    matches: firstRoundMatches,
  });

  for (let roundIndex = 1; roundIndex < totalRounds; roundIndex += 1) {
    const previousRound = rounds[roundIndex - 1].matches;
    const roundMatches: BracketMatch[] = [];

    for (let matchIndex = 0; matchIndex < previousRound.length / 2; matchIndex += 1) {
      const feederTop = previousRound[matchIndex * 2];
      const feederBottom = previousRound[matchIndex * 2 + 1];
      const top = participantFromSlot(
        feederTop?.winnerName
          ? { name: feederTop.winnerName, isBye: false }
          : { name: "", isBye: false },
      );
      const bottom = participantFromSlot(
        feederBottom?.winnerName
          ? { name: feederBottom.winnerName, isBye: false }
          : { name: "", isBye: false },
      );

      roundMatches.push({
        matchNumber,
        roundIndex,
        matchIndex,
        top,
        bottom,
        winnerName: byeAdvanceWinner(top, bottom),
      });
      matchNumber += 1;
    }

    rounds.push({
      label: roundLabelForIndex(roundIndex, totalRounds),
      roundIndex,
      matches: roundMatches,
    });
  }

  return {
    competitionName: input.competitionName.trim() || "Competition",
    divisionName: input.divisionName.trim() || "Division",
    bracketSize,
    rounds,
  };
}

export function buildCompetitionBracketsFromForm(input: {
  competitionName: string;
  divisionName: string;
  competitorsText: string;
  seedOrder: SeedOrderMode;
  multipleBrackets: boolean;
}): CompetitionBracket[] {
  const groups = parseCompetitorGroups(
    input.competitorsText,
    input.divisionName,
    input.multipleBrackets,
  );

  return groups.map((group) =>
    buildCompetitionBracket({
      competitionName: input.competitionName,
      divisionName: group.divisionName,
      competitors: group.competitors,
      seedOrder: input.seedOrder,
    }),
  );
}

export function sanitizeBracketFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
