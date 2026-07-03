export type SeedOrderMode = "entered" | "shuffle";

export type BracketSlotSource =
  | "competitor"
  | "preliminary-winner"
  | "empty";

export interface BracketBuildInput {
  competitionName: string;
  divisionName: string;
  scheduleTime?: string;
  notes?: string;
  competitors: string[];
  seedOrder?: SeedOrderMode;
}

export interface BracketParticipant {
  name: string;
  source: BracketSlotSource;
}

export interface BracketMatch {
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
  scheduleTime: string;
  notes: string;
  competitorCount: number;
  /** Entrants at the first main-bracket round (after any preliminary). */
  mainBracketSize: number;
  preliminaryMatchCount: number;
  rounds: BracketRound[];
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

/**
 * Derives a round heading from the number of matches in that round. Because the
 * main bracket is always a power of two, match counts are always powers of two
 * and every round maps to exactly one canonical label. "Final" is only ever
 * produced for the single-match round, so it can never appear twice.
 */
export function mainRoundLabelForMatchCount(matchCount: number): string {
  if (matchCount <= 1) {
    return "Final";
  }

  if (matchCount === 2) {
    return "Semi-Final";
  }

  if (matchCount === 4) {
    return "Quarter-Final";
  }

  return `Round of ${matchCount * 2}`;
}

export interface MainFirstRoundSeeding {
  matches: Array<{ top: BracketParticipant; bottom: BracketParticipant }>;
  /**
   * For each preliminary match (by index) the main-bracket slot its winner
   * advances into. Ordered to match the preliminary matches produced by
   * `buildCompetitionBracket`.
   */
  preliminaryFeeds: Array<{ mainMatchIndex: number; slot: "top" | "bottom" }>;
}

/**
 * Distributes preliminary winners and bye competitors across the main bracket's
 * first round.
 *
 * The main first round always has exactly `mainBracketSize / 2` matches (a power
 * of two), and every slot is filled with a real participant — either a bye
 * competitor or a preliminary-winner placeholder. No phantom empty-vs-empty
 * matches are ever created.
 *
 * When there are more preliminary matches than main matches (e.g. 7 entrants →
 * 3 play-ins into 2 semi-finals), the surplus preliminary matches "double up",
 * feeding both the top and bottom slot of the same main match.
 */
export function seedMainFirstRound(
  byePlayers: string[],
  preliminaryMatchCount: number,
  mainBracketSize: number,
): MainFirstRoundSeeding {
  const matchCount = Math.max(Math.floor(mainBracketSize / 2), 1);
  const doubleUpMatches = Math.max(0, preliminaryMatchCount - matchCount);
  const singlePreliminaryMatches = preliminaryMatchCount - doubleUpMatches * 2;
  const byeByeMatches = matchCount - doubleUpMatches - singlePreliminaryMatches;

  const byeQueue = [...byePlayers];
  const matches: MainFirstRoundSeeding["matches"] = [];
  const preliminaryFeeds: MainFirstRoundSeeding["preliminaryFeeds"] = [];

  const takeBye = (): BracketParticipant => {
    const name = byeQueue.shift();
    return name ? competitor(name) : emptySlot();
  };

  const takePreliminary = (
    mainMatchIndex: number,
    slot: "top" | "bottom",
  ): BracketParticipant => {
    preliminaryFeeds.push({ mainMatchIndex, slot });
    return preliminaryWinner();
  };

  // Byes are seeded at the top so top-of-list competitors skip the play-in
  // round, followed by play-in matches feeding a single slot, then the doubled
  // up play-in matches at the bottom near the preliminary column.
  for (let index = 0; index < byeByeMatches; index += 1) {
    matches.push({ top: takeBye(), bottom: takeBye() });
  }

  for (let index = 0; index < singlePreliminaryMatches; index += 1) {
    const mainMatchIndex = matches.length;
    matches.push({
      top: takePreliminary(mainMatchIndex, "top"),
      bottom: takeBye(),
    });
  }

  for (let index = 0; index < doubleUpMatches; index += 1) {
    const mainMatchIndex = matches.length;
    matches.push({
      top: takePreliminary(mainMatchIndex, "top"),
      bottom: takePreliminary(mainMatchIndex, "bottom"),
    });
  }

  return { matches, preliminaryFeeds };
}

function buildMainRounds(
  firstRoundMatches: Array<{ top: BracketParticipant; bottom: BracketParticipant }>,
  startingRoundIndex: number,
): BracketRound[] {
  const rounds: BracketRound[] = [];
  let currentMatches = firstRoundMatches.map((match, matchIndex) => ({
    roundIndex: startingRoundIndex,
    matchIndex,
    isPreliminary: false,
    top: match.top,
    bottom: match.bottom,
  }));

  let roundIndex = startingRoundIndex;

  rounds.push({
    label: mainRoundLabelForMatchCount(currentMatches.length),
    roundIndex,
    isPreliminary: false,
    matches: currentMatches,
  });

  while (currentMatches.length > 1) {
    roundIndex += 1;
    const nextMatches: BracketMatch[] = [];

    for (let matchIndex = 0; matchIndex < currentMatches.length / 2; matchIndex += 1) {
      nextMatches.push({
        roundIndex,
        matchIndex,
        isPreliminary: false,
        top: emptySlot(),
        bottom: emptySlot(),
      });
    }

    rounds.push({
      label: mainRoundLabelForMatchCount(nextMatches.length),
      roundIndex,
      isPreliminary: false,
      matches: nextMatches,
    });

    currentMatches = nextMatches;
  }

  return rounds;
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

  const byePlayers = orderedNames.slice(0, plan.byePlayerCount);
  const preliminaryPlayers = orderedNames.slice(plan.byePlayerCount);

  const seeding = seedMainFirstRound(
    byePlayers,
    plan.preliminaryMatchCount,
    plan.mainBracketEntrants,
  );

  if (plan.preliminaryMatchCount > 0) {
    const preliminaryMatches: BracketMatch[] = [];

    for (let index = 0; index < plan.preliminaryMatchCount; index += 1) {
      const feed = seeding.preliminaryFeeds[index];

      preliminaryMatches.push({
        roundIndex: 0,
        matchIndex: index,
        isPreliminary: true,
        top: competitor(preliminaryPlayers[index * 2] ?? ""),
        bottom: competitor(preliminaryPlayers[index * 2 + 1] ?? ""),
        feedsMainMatchIndex: feed?.mainMatchIndex ?? index,
        feedsMainSlot: feed?.slot ?? "top",
      });
    }

    rounds.push({
      label: preliminaryRoundLabel(),
      roundIndex: 0,
      isPreliminary: true,
      matches: preliminaryMatches,
    });
  }

  const mainStartRoundIndex = plan.preliminaryMatchCount > 0 ? 1 : 0;
  const mainRounds = buildMainRounds(seeding.matches, mainStartRoundIndex);

  rounds.push(...mainRounds);

  return {
    competitionName: input.competitionName.trim() || "Competition",
    divisionName: input.divisionName.trim() || "Division",
    scheduleTime: input.scheduleTime?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    competitorCount: orderedNames.length,
    mainBracketSize: plan.mainBracketEntrants,
    preliminaryMatchCount: plan.preliminaryMatchCount,
    rounds,
  };
}

export function formatBracketHeaderLine(label: string, value: string) {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : `${label}: `;
}

export function formatBracketNotesForDisplay(notes: string) {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
}

export function buildCompetitionBracketFromForm(input: {
  competitionName: string;
  divisionName: string;
  scheduleTime?: string;
  notes?: string;
  competitorsText: string;
}): CompetitionBracket {
  return buildCompetitionBracket({
    competitionName: input.competitionName,
    divisionName: input.divisionName,
    scheduleTime: input.scheduleTime,
    notes: input.notes,
    competitors: parseCompetitorLines(input.competitorsText),
    seedOrder: "entered",
  });
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
  if (participant.source !== "competitor") {
    return "";
  }

  return participant.name;
}

/**
 * A "BYE vs BYE" match is a played starting-round match (preliminary or the
 * first main round) that has no real participant on either side. Later rounds
 * are intentionally blank for handwriting, so they are excluded.
 */
export function hasByeVersusByeMatch(bracket: CompetitionBracket) {
  const firstMainRoundIndex = bracket.preliminaryMatchCount > 0 ? 1 : 0;

  return bracket.rounds.some((round) => {
    const isStartingRound =
      round.isPreliminary || round.roundIndex === firstMainRoundIndex;

    if (!isStartingRound) {
      return false;
    }

    return round.matches.some(
      (match) =>
        match.top.source === "empty" && match.bottom.source === "empty",
    );
  });
}
