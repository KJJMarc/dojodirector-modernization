import type { BracketMatch, CompetitionBracket } from "@/lib/competition-bracket.shared";

export const BRACKET_PAGE_A4_LANDSCAPE = {
  width: 841.89,
  height: 595.28,
} as const;

export const BRACKET_PAGE_A3_LANDSCAPE = {
  width: 1190.55,
  height: 841.89,
} as const;

export interface BracketPageSize {
  width: number;
  height: number;
}

export interface BracketLayoutMatch {
  matchNumber: number;
  matchIndex: number;
  roundIndex: number;
  roundLabel: string;
  topLabel: string;
  bottomLabel: string;
  winnerLabel: string;
  topY: number;
  bottomY: number;
  centerY: number;
  nameLineStartX: number;
  nameLineEndX: number;
  connectorX: number;
  winnerLineEndX: number;
}

export interface BracketLayout {
  page: BracketPageSize;
  scale: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  titleY: number;
  bracketTop: number;
  bracketBottom: number;
  bracketLeft: number;
  bracketRight: number;
  roundColumnWidth: number;
  nameLineLength: number;
  connectorWidth: number;
  matchGap: number;
  rounds: {
    label: string;
    roundIndex: number;
    columnX: number;
    labelY: number;
    matches: BracketLayoutMatch[];
  }[];
}

function resolvePageSize(bracketSize: number): BracketPageSize {
  if (bracketSize > 16) {
    return BRACKET_PAGE_A3_LANDSCAPE;
  }

  return BRACKET_PAGE_A4_LANDSCAPE;
}

function resolveScale(bracketSize: number): number {
  if (bracketSize >= 32) {
    return 0.82;
  }

  if (bracketSize >= 16) {
    return 0.9;
  }

  return 1;
}

function displayParticipantLabel(name: string, isBye: boolean) {
  if (isBye) {
    return "BYE";
  }

  return name;
}

export function buildBracketLayout(bracket: CompetitionBracket): BracketLayout {
  const page = resolvePageSize(bracket.bracketSize);
  const scale = resolveScale(bracket.bracketSize);
  const marginX = 36 * scale;
  const marginTop = 72 * scale;
  const marginBottom = 36 * scale;
  const titleY = page.height - 28 * scale;
  const bracketTop = page.height - marginTop - 24 * scale;
  const bracketBottom = marginBottom;
  const bracketLeft = marginX;
  const bracketRight = page.width - marginX;
  const bracketWidth = bracketRight - bracketLeft;
  const roundCount = bracket.rounds.length;
  const roundColumnWidth = bracketWidth / roundCount;
  const nameLineLength = Math.min(118 * scale, roundColumnWidth * 0.42);
  const connectorWidth = Math.min(34 * scale, roundColumnWidth * 0.18);
  const matchGap = 8 * scale;
  const bracketHeight = bracketTop - bracketBottom;
  const leafSlotHeight = bracketHeight / (bracket.bracketSize / 2);

  const rounds = bracket.rounds.map((round, roundIndex) => {
    const columnX = bracketLeft + roundIndex * roundColumnWidth;
    const nameLineStartX = columnX + 8 * scale;
    const nameLineEndX = nameLineStartX + nameLineLength;
    const connectorX = nameLineEndX + connectorWidth;
    const winnerLineEndX =
      roundIndex === roundCount - 1
        ? connectorX
        : columnX + roundColumnWidth - 10 * scale;

    const matches = round.matches.map((match) =>
      layoutMatch({
        match,
        roundIndex,
        roundLabel: round.label,
        bracketSize: bracket.bracketSize,
        leafSlotHeight,
        bracketTop,
        matchGap,
        nameLineStartX,
        nameLineEndX,
        connectorX,
        winnerLineEndX,
      }),
    );

    return {
      label: round.label,
      roundIndex,
      columnX,
      labelY: bracketTop + 14 * scale,
      matches,
    };
  });

  return {
    page,
    scale,
    marginX,
    marginTop,
    marginBottom,
    titleY,
    bracketTop,
    bracketBottom,
    bracketLeft,
    bracketRight,
    roundColumnWidth,
    nameLineLength,
    connectorWidth,
    matchGap,
    rounds,
  };
}

function layoutMatch(input: {
  match: BracketMatch;
  roundIndex: number;
  roundLabel: string;
  bracketSize: number;
  leafSlotHeight: number;
  bracketTop: number;
  matchGap: number;
  nameLineStartX: number;
  nameLineEndX: number;
  connectorX: number;
  winnerLineEndX: number;
}): BracketLayoutMatch {
  const matchSpan = input.leafSlotHeight * 2 ** input.roundIndex;
  const centerY =
    input.bracketTop -
    matchSpan * input.match.matchIndex -
    matchSpan / 2;
  const halfGap = input.matchGap + 7;

  return {
    matchNumber: input.match.matchNumber,
    matchIndex: input.match.matchIndex,
    roundIndex: input.roundIndex,
    roundLabel: input.roundLabel,
    topLabel: displayParticipantLabel(
      input.match.top.name,
      input.match.top.isBye,
    ),
    bottomLabel: displayParticipantLabel(
      input.match.bottom.name,
      input.match.bottom.isBye,
    ),
    winnerLabel: input.match.winnerName,
    topY: centerY + halfGap,
    bottomY: centerY - halfGap,
    centerY,
    nameLineStartX: input.nameLineStartX,
    nameLineEndX: input.nameLineEndX,
    connectorX: input.connectorX,
    winnerLineEndX: input.winnerLineEndX,
  };
}

export function getBracketTitleLines(bracket: CompetitionBracket) {
  return {
    competitionName: bracket.competitionName,
    divisionName: bracket.divisionName,
  };
}
