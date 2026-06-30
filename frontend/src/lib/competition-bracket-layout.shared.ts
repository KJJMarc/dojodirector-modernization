import {
  displayParticipantLabel,
  formatBracketHeaderLine,
  formatBracketNotesForDisplay,
  type BracketMatch,
  type CompetitionBracket,
} from "@/lib/competition-bracket.shared";

export const BRACKET_PAGE_A4_LANDSCAPE = {
  width: 841.89,
  height: 595.28,
} as const;

export const BRACKET_PAGE_A3_LANDSCAPE = {
  width: 1190.55,
  height: 841.89,
} as const;

export const BRACKET_FONT_FAMILY =
  'Helvetica, Arial, "Segoe UI", system-ui, sans-serif';

export interface BracketPageSize {
  width: number;
  height: number;
}

export interface BracketLayoutMatch {
  matchIndex: number;
  roundIndex: number;
  isPreliminary: boolean;
  roundLabel: string;
  topLabel: string;
  bottomLabel: string;
  topY: number;
  bottomY: number;
  topTextBaselineY: number;
  bottomTextBaselineY: number;
  centerY: number;
  nameLineStartX: number;
  nameLineEndX: number;
  connectorX: number;
  winnerLineEndX: number;
  feedsMainMatchIndex?: number;
  feedsMainSlot?: "top" | "bottom";
}

export interface BracketLayout {
  page: BracketPageSize;
  scale: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  titleY: number;
  divisionY: number;
  timeY: number;
  notesY: number;
  roundHeaderY: number;
  bracketTop: number;
  bracketBottom: number;
  bracketLeft: number;
  bracketRight: number;
  roundColumnWidth: number;
  nameLineLength: number;
  connectorWidth: number;
  nameFontSize: number;
  titleFontSize: number;
  metaFontSize: number;
  roundHeaderFontSize: number;
  lineThickness: number;
  matchGap: number;
  competitorNameLineGap: number;
  rounds: {
    label: string;
    roundIndex: number;
    isPreliminary: boolean;
    columnX: number;
    matches: BracketLayoutMatch[];
  }[];
}

export const BRACKET_COMPETITOR_NAME_LINE_GAP = 8;

export function bracketSvgTextBaselineY(
  pdfBaselineY: number,
  pageHeight: number,
): number {
  return pageHeight - pdfBaselineY;
}

export function bracketRoundHeaderX(
  columnX: number,
  roundColumnWidth: number,
  label: string,
  headerFontSize: number,
): number {
  const labelWidthEstimate = label.length * headerFontSize * 0.55;

  return columnX + roundColumnWidth / 2 - labelWidthEstimate / 2;
}

function resolvePageSize(mainBracketSize: number): BracketPageSize {
  if (mainBracketSize > 16) {
    return BRACKET_PAGE_A3_LANDSCAPE;
  }

  return BRACKET_PAGE_A4_LANDSCAPE;
}

function resolveScale(mainBracketSize: number, roundCount: number): number {
  if (mainBracketSize >= 32 || roundCount >= 5) {
    return 0.9;
  }

  if (mainBracketSize >= 16 || roundCount >= 4) {
    return 0.96;
  }

  if (mainBracketSize >= 8) {
    return 1;
  }

  return 1;
}

function getMainRoundIndex(
  bracket: CompetitionBracket,
  roundIndex: number,
  isPreliminary: boolean,
) {
  if (isPreliminary) {
    return -1;
  }

  return roundIndex - (bracket.preliminaryMatchCount > 0 ? 1 : 0);
}

function layoutMainMatchCenterY(input: {
  mainRoundIndex: number;
  matchIndex: number;
  mainBracketSize: number;
  bracketTop: number;
  bracketBottom: number;
}) {
  const bracketHeight = input.bracketTop - input.bracketBottom;
  const leafCount = Math.max(input.mainBracketSize / 2, 1);
  const leafSlotHeight = bracketHeight / leafCount;
  const matchSpan = leafSlotHeight * 2 ** input.mainRoundIndex;

  return (
    input.bracketTop -
    matchSpan * input.matchIndex -
    matchSpan / 2
  );
}

export function buildBracketLayout(bracket: CompetitionBracket): BracketLayout {
  const page = resolvePageSize(bracket.mainBracketSize);
  const roundCount = bracket.rounds.length;
  const scale = resolveScale(bracket.mainBracketSize, roundCount);
  const marginX = 56 * scale;
  const marginTop = 88 * scale;
  const marginBottom = 36 * scale;
  const titleFontSize = 20 * scale;
  const metaFontSize = 11.5 * scale;
  const titleY = page.height - 26 * scale;
  const divisionY = titleY - 22 * scale;
  const timeY = divisionY - 17 * scale;
  const notesY = timeY - 17 * scale;
  const roundHeaderY = notesY - 24 * scale;
  const bracketTop = roundHeaderY - 20 * scale;
  const bracketBottom = marginBottom + 10 * scale;
  const bracketLeft = marginX;
  const bracketRight = page.width - marginX * 0.7;
  const bracketWidth = bracketRight - bracketLeft;
  const roundColumnWidth = bracketWidth / roundCount;
  const nameLineLength = Math.min(132 * scale, roundColumnWidth * 0.44);
  const connectorWidth = Math.min(32 * scale, roundColumnWidth * 0.15);
  const matchGap = 9 * scale;
  const nameFontSize = 11 * scale;
  const roundHeaderFontSize = 13.5 * scale;
  const lineThickness = 1;
  const competitorNameLineGap = BRACKET_COMPETITOR_NAME_LINE_GAP * scale;
  const mainMatchCenters = new Map<string, BracketLayoutMatch>();

  const rounds = bracket.rounds.map((round, columnIndex) => {
    const columnX = bracketLeft + columnIndex * roundColumnWidth;
    const nameLineStartX = columnX + 10 * scale;
    const nameLineEndX = nameLineStartX + nameLineLength;
    const connectorX = nameLineEndX + connectorWidth;
    const winnerLineEndX =
      columnIndex === roundCount - 1
        ? connectorX + 8 * scale
        : columnX + roundColumnWidth - 8 * scale;
    const mainRoundIndex = getMainRoundIndex(
      bracket,
      round.roundIndex,
      round.isPreliminary,
    );

    const matches = round.matches.map((match) =>
      layoutMatch({
        match,
        round,
        mainRoundIndex,
        bracket,
        bracketTop,
        bracketBottom,
        matchGap,
        nameLineStartX,
        nameLineEndX,
        connectorX,
        winnerLineEndX,
        competitorNameLineGap,
        mainMatchCenters,
      }),
    );

    return {
      label: round.label,
      roundIndex: round.roundIndex,
      isPreliminary: round.isPreliminary,
      columnX,
      matches,
    };
  });

  if (bracket.preliminaryMatchCount > 0) {
    const preliminaryRound = rounds.find((round) => round.isPreliminary);
    const firstMainRound = rounds.find((round) => !round.isPreliminary);

    if (preliminaryRound && firstMainRound) {
      for (const prelimMatch of preliminaryRound.matches) {
        const feederMain = firstMainRound.matches[prelimMatch.feedsMainMatchIndex ?? 0];

        if (!feederMain) {
          continue;
        }

        const halfGap = matchGap + 10;
        prelimMatch.centerY = feederMain.centerY;
        prelimMatch.topY = feederMain.centerY + halfGap;
        prelimMatch.bottomY = feederMain.centerY - halfGap;
      }
    }
  }

  return {
    page,
    scale,
    marginX,
    marginTop,
    marginBottom,
    titleY,
    divisionY,
    timeY,
    notesY,
    roundHeaderY,
    bracketTop,
    bracketBottom,
    bracketLeft,
    bracketRight,
    roundColumnWidth,
    nameLineLength,
    connectorWidth,
    nameFontSize,
    titleFontSize,
    metaFontSize,
    roundHeaderFontSize,
    lineThickness,
    matchGap,
    competitorNameLineGap,
    rounds,
  };
}

function layoutMatch(input: {
  match: BracketMatch;
  round: CompetitionBracket["rounds"][number];
  mainRoundIndex: number;
  bracket: CompetitionBracket;
  bracketTop: number;
  bracketBottom: number;
  matchGap: number;
  nameLineStartX: number;
  nameLineEndX: number;
  connectorX: number;
  winnerLineEndX: number;
  competitorNameLineGap: number;
  mainMatchCenters: Map<string, BracketLayoutMatch>;
}): BracketLayoutMatch {
  const halfGap = input.matchGap + 10;
  let centerY = input.bracketTop / 2;

  if (!input.round.isPreliminary && input.mainRoundIndex >= 0) {
    centerY = layoutMainMatchCenterY({
      mainRoundIndex: input.mainRoundIndex,
      matchIndex: input.match.matchIndex,
      mainBracketSize: input.bracket.mainBracketSize,
      bracketTop: input.bracketTop,
      bracketBottom: input.bracketBottom,
    });
  } else if (input.round.isPreliminary) {
    centerY = layoutMainMatchCenterY({
      mainRoundIndex: 0,
      matchIndex: input.match.feedsMainMatchIndex ?? input.match.matchIndex,
      mainBracketSize: input.bracket.mainBracketSize,
      bracketTop: input.bracketTop,
      bracketBottom: input.bracketBottom,
    });
  }

  const topLineY = centerY + halfGap;
  const bottomLineY = centerY - halfGap;

  const layoutMatch: BracketLayoutMatch = {
    matchIndex: input.match.matchIndex,
    roundIndex: input.round.roundIndex,
    isPreliminary: input.round.isPreliminary,
    roundLabel: input.round.label,
    topLabel: displayParticipantLabel(input.match.top),
    bottomLabel: displayParticipantLabel(input.match.bottom),
    topY: topLineY,
    bottomY: bottomLineY,
    topTextBaselineY: topLineY + input.competitorNameLineGap,
    bottomTextBaselineY: bottomLineY + input.competitorNameLineGap,
    centerY,
    nameLineStartX: input.nameLineStartX,
    nameLineEndX: input.nameLineEndX,
    connectorX: input.connectorX,
    winnerLineEndX: input.winnerLineEndX,
    feedsMainMatchIndex: input.match.feedsMainMatchIndex,
    feedsMainSlot: input.match.feedsMainSlot,
  };

  if (!input.round.isPreliminary && input.mainRoundIndex === 0) {
    input.mainMatchCenters.set(
      `${input.match.matchIndex}`,
      layoutMatch,
    );
  }

  return layoutMatch;
}

export function getBracketTitleLines(bracket: CompetitionBracket) {
  return {
    competitionName: bracket.competitionName,
    divisionName: bracket.divisionName,
    timeLine: formatBracketHeaderLine("Time", bracket.scheduleTime),
    notesLine: formatBracketHeaderLine(
      "Notes",
      formatBracketNotesForDisplay(bracket.notes),
    ),
  };
}

export function findFeederConnectorTargets(layout: BracketLayout) {
  const segments: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }> = [];

  for (let roundIndex = 0; roundIndex < layout.rounds.length - 1; roundIndex += 1) {
    const currentRound = layout.rounds[roundIndex];
    const nextRound = layout.rounds[roundIndex + 1];

    if (currentRound.isPreliminary) {
      for (const match of currentRound.matches) {
        const feederMain = nextRound.matches[match.feedsMainMatchIndex ?? 0];

        if (!feederMain) {
          continue;
        }

        const targetY =
          match.feedsMainSlot === "bottom"
            ? feederMain.bottomY
            : feederMain.topY;

        segments.push({
          x1: match.winnerLineEndX,
          y1: match.centerY,
          x2: feederMain.nameLineStartX,
          y2: targetY,
        });
      }

      continue;
    }

    if (nextRound.isPreliminary) {
      continue;
    }

    for (const match of currentRound.matches) {
      const nextMatch = nextRound.matches[Math.floor(match.matchIndex / 2)];

      if (!nextMatch) {
        continue;
      }

      const targetY =
        match.matchIndex % 2 === 0 ? nextMatch.topY : nextMatch.bottomY;

      segments.push({
        x1: match.winnerLineEndX,
        y1: match.centerY,
        x2: nextMatch.nameLineStartX,
        y2: targetY,
      });
    }
  }

  return segments;
}
