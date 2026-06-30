export type SeedOrderMode = "entered" | "shuffle";

export type BracketSlotSource =
  | "competitor"
  | "preliminary-winner"
  | "empty";

export interface BracketBuildInput {
  competitionName: string;
  divisionName: string;
  competitors: string[];
  seedOrder?: SeedOrderMode;
}

export interface BracketParticipant {
  name: string;
  source: BracketSlotSource;
}

export interface BracketMatch {
  matchNumber: number;
  roundIndex: number;
  matchIndex: number;
  isPreliminary: boolean;
  top: BracketParticipant;
  bottom: BracketParticipant;
  /** Main-bracket match fed by this preliminary match, if applicable. */
  feedsMainMatchIndex?: number;
  /** Whether the preliminary winner feeds the top or bottom slot. */
  feedsMainSlot?: "top" | "bottom";
}

export interface BracketRound {
  label: string;
  roundIndex: number;
  isPreliminary: boolean;
  matches: BracketMatch[];
}

export interface CompetitionBracket {
  competitionName: string;
  divisionName: string;
  /** Entrants at the first main-bracket round (after any preliminary). */
  mainBracketSize: number;
  preliminaryMatchCount: number;
  rounds: BracketRound[];
}

export interface ParsedBracketGroup {
  divisionName: string;
  competitors: string[];
}

export interface BracketStructurePlan {
  targetBracketSize: number;
  preliminaryMatchCount: number;
  byePlayerCount: number;
  mainBracketEntrants: number;
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

export function nextPowerOfTwo(value: number): number {
  let size = 1;

  while (size < value) {
    size *= 2;
  }

  return size;
}

export function bracketSizeForCompetitorCount(count: number): number {
  return nextPowerOfTwo(Math.max(count, 2));
}

export function planBracketStructure(competitorCount: number): BracketStructurePlan {
  const count = Math.max(competitorCount, 0);
  const targetBracketSize = bracketSizeForCompetitorCount(Math.max(count, 1));
  const preliminaryMatchCount =
    count < targetBracketSize && count > targetBracketSize / 2
      ? count - targetBracketSize / 2
      : 0;
  const byePlayerCount = count - preliminaryMatchCount * 2;
  const mainBracketEntrants = count - preliminaryMatchCount;

  return {
    targetBracketSize,
    preliminaryMatchCount,
    byePlayerCount,
    mainBracketEntrants: Math.max(mainBracketEntrants, 1),
  };
}

export function shuffleCompetitors(names: string[]): string[] {
  const shuffled = [...names];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function competitor(name: string): BracketParticipant {
  return { name, source: "competitor" };
}

function preliminaryWinner(): BracketParticipant {
  return { name: "", source: "preliminary-winner" };
}

function emptySlot(): BracketParticipant {
  return { name: "", source: "empty" };
}

export function preliminaryRoundLabel() {
  return "Preliminary Round";
}

export function mainRoundLabel(
  roundIndex: number,
  mainBracketEntrants: number,
): string {
  const mainRoundCount = Math.log2(Math.max(mainBracketEntrants, 2));
  const roundsRemaining = mainRoundCount - roundIndex;

  if (mainBracketEntrants <= 2 && roundIndex === 0) {
    return "Final";
  }

  if (roundsRemaining <= 1) {
    return "Final";
  }

  if (roundsRemaining === 2) {
    return "Semi-Final";
  }

  if (roundsRemaining === 3) {
    return "Quarter-Final";
  }

  return `Round ${roundIndex + 1}`;
}

function pairMainFirstRound(
  byePlayers: string[],
  preliminaryMatchCount: number,
): Array<{ top: BracketParticipant; bottom: BracketParticipant }> {
  const matches: Array<{ top: BracketParticipant; bottom: BracketParticipant }> =
    [];
  const byeQueue = [...byePlayers];

  for (let index = 0; index < preliminaryMatchCount; index += 1) {
    const byePlayer = byeQueue.shift();

    matches.push({
      top: preliminaryWinner(),
      bottom: byePlayer ? competitor(byePlayer) : emptySlot(),
    });
  }

  while (byeQueue.length >= 2) {
    matches.push({
      top: competitor(byeQueue.shift() ?? ""),
      bottom: competitor(byeQueue.shift() ?? ""),
    });
  }

  if (byeQueue.length === 1) {
    matches.push({
      top: competitor(byeQueue[0] ?? ""),
      bottom: emptySlot(),
    });
  }

  return matches;
}

function buildMainRounds(
  firstRoundMatches: Array<{ top: BracketParticipant; bottom: BracketParticipant }>,
  mainBracketEntrants: number,
  startingMatchNumber: number,
  startingRoundIndex: number,
): { rounds: BracketRound[]; nextMatchNumber: number } {
  const rounds: BracketRound[] = [];
  let matchNumber = startingMatchNumber;
  let currentMatches = firstRoundMatches.map((match, matchIndex) => ({
    matchNumber: matchNumber + matchIndex,
    roundIndex: startingRoundIndex,
    matchIndex,
    isPreliminary: false,
    top: match.top,
    bottom: match.bottom,
  }));
  matchNumber += currentMatches.length;

  let roundIndex = startingRoundIndex;
  let mainRoundIndex = 0;

  rounds.push({
    label: mainRoundLabel(mainRoundIndex, mainBracketEntrants),
    roundIndex,
    isPreliminary: false,
    matches: currentMatches,
  });

  while (currentMatches.length > 1) {
    roundIndex += 1;
    mainRoundIndex += 1;
    const nextMatches: BracketMatch[] = [];

    for (let matchIndex = 0; matchIndex < currentMatches.length / 2; matchIndex += 1) {
      nextMatches.push({
        matchNumber,
        roundIndex,
        matchIndex,
        isPreliminary: false,
        top: emptySlot(),
        bottom: emptySlot(),
      });
      matchNumber += 1;
    }

    rounds.push({
      label: mainRoundLabel(mainRoundIndex, mainBracketEntrants),
      roundIndex,
      isPreliminary: false,
      matches: nextMatches,
    });

    currentMatches = nextMatches;
  }

  return { rounds, nextMatchNumber: matchNumber };
}

export function buildCompetitionBracket(
  input: BracketBuildInput,
): CompetitionBracket {
  const seedOrder = input.seedOrder ?? "entered";
  const orderedNames =
    seedOrder === "shuffle"
      ? shuffleCompetitors(input.competitors)
      : [...input.competitors];
  const plan = planBracketStructure(orderedNames.length);
  const rounds: BracketRound[] = [];
  let matchNumber = 1;

  const byePlayers = orderedNames.slice(0, plan.byePlayerCount);
  const preliminaryPlayers = orderedNames.slice(plan.byePlayerCount);

  if (plan.preliminaryMatchCount > 0) {
    const preliminaryMatches: BracketMatch[] = [];

    for (let index = 0; index < plan.preliminaryMatchCount; index += 1) {
      preliminaryMatches.push({
        matchNumber,
        roundIndex: 0,
        matchIndex: index,
        isPreliminary: true,
        top: competitor(preliminaryPlayers[index * 2] ?? ""),
        bottom: competitor(preliminaryPlayers[index * 2 + 1] ?? ""),
        feedsMainMatchIndex: index,
        feedsMainSlot: "top",
      });
      matchNumber += 1;
    }

    rounds.push({
      label: preliminaryRoundLabel(),
      roundIndex: 0,
      isPreliminary: true,
      matches: preliminaryMatches,
    });
  }

  const mainStartRoundIndex = plan.preliminaryMatchCount > 0 ? 1 : 0;
  const firstMainMatches = pairMainFirstRound(
    byePlayers,
    plan.preliminaryMatchCount,
  );

  const { rounds: mainRounds } = buildMainRounds(
    firstMainMatches,
    plan.mainBracketEntrants,
    matchNumber,
    mainStartRoundIndex,
  );

  rounds.push(...mainRounds);

  return {
    competitionName: input.competitionName.trim() || "Competition",
    divisionName: input.divisionName.trim() || "Division",
    mainBracketSize: plan.mainBracketEntrants,
    preliminaryMatchCount: plan.preliminaryMatchCount,
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

export function displayParticipantLabel(participant: BracketParticipant) {
  if (participant.source === "preliminary-winner") {
    return "";
  }

  return participant.name;
}

export function hasByeVersusByeMatch(bracket: CompetitionBracket) {
  return bracket.rounds.some((round) =>
    round.matches.some(
      (match) =>
        match.top.name === "BYE" &&
        match.bottom.name === "BYE",
    ),
  );
}
