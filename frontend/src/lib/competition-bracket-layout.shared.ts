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
  leafSlotCount: number;
  leafSlotHeight: number;
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

const BRACKET_MARGIN_X = 56;
const BRACKET_MARGIN_BOTTOM = 36;
const BRACKET_TITLE_FONT_SIZE = 20;
const BRACKET_META_FONT_SIZE = 11.5;
const BRACKET_ROUND_HEADER_FONT_SIZE = 13.5;
const BRACKET_NAME_FONT_SIZE = 11;
const BRACKET_LINE_THICKNESS = 1;
const BRACKET_NAME_LINE_LENGTH = 132;
const BRACKET_CONNECTOR_WIDTH = 32;
const BRACKET_MIN_NAME_FONT_SIZE = 8;
const BRACKET_MIN_NAME_LINE_GAP = 3;
const BRACKET_MIN_HALF_GAP = 3;

const BRACKET_HEADER_TITLE_OFFSET = 26;
const BRACKET_HEADER_DIVISION_OFFSET = 22;
const BRACKET_HEADER_TIME_OFFSET = 17;
const BRACKET_HEADER_NOTES_OFFSET = 17;
const BRACKET_HEADER_ROUND_OFFSET = 24;
const BRACKET_HEADER_BRACKET_GAP = 16;

const TEXT_ASCENT_RATIO = 0.72;
const TEXT_DESCENT_RATIO = 0.22;

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

interface BracketTypography {
  titleFontSize: number;
  metaFontSize: number;
  roundHeaderFontSize: number;
  nameFontSize: number;
  nameLineGap: number;
  headerTitleOffset: number;
  headerDivisionOffset: number;
  headerTimeOffset: number;
  headerNotesOffset: number;
  headerRoundOffset: number;
  headerBracketGap: number;
  marginBottom: number;
}

function defaultTypography(): BracketTypography {
  return {
    titleFontSize: BRACKET_TITLE_FONT_SIZE,
    metaFontSize: BRACKET_META_FONT_SIZE,
    roundHeaderFontSize: BRACKET_ROUND_HEADER_FONT_SIZE,
    nameFontSize: BRACKET_NAME_FONT_SIZE,
    nameLineGap: BRACKET_COMPETITOR_NAME_LINE_GAP,
    headerTitleOffset: BRACKET_HEADER_TITLE_OFFSET,
    headerDivisionOffset: BRACKET_HEADER_DIVISION_OFFSET,
    headerTimeOffset: BRACKET_HEADER_TIME_OFFSET,
    headerNotesOffset: BRACKET_HEADER_NOTES_OFFSET,
    headerRoundOffset: BRACKET_HEADER_ROUND_OFFSET,
    headerBracketGap: BRACKET_HEADER_BRACKET_GAP,
    marginBottom: BRACKET_MARGIN_BOTTOM,
  };
}

function tightenTypography(typography: BracketTypography): BracketTypography {
  return {
    ...typography,
    nameFontSize: Math.max(
      BRACKET_MIN_NAME_FONT_SIZE,
      typography.nameFontSize - 0.5,
    ),
    nameLineGap: Math.max(
      BRACKET_MIN_NAME_LINE_GAP,
      typography.nameLineGap - 0.5,
    ),
    headerBracketGap: Math.max(8, typography.headerBracketGap - 1),
    headerRoundOffset: Math.max(16, typography.headerRoundOffset - 1),
    headerNotesOffset: Math.max(12, typography.headerNotesOffset - 0.5),
    headerTimeOffset: Math.max(12, typography.headerTimeOffset - 0.5),
    headerDivisionOffset: Math.max(16, typography.headerDivisionOffset - 0.5),
    headerTitleOffset: Math.max(18, typography.headerTitleOffset - 0.5),
    marginBottom: Math.max(24, typography.marginBottom - 1),
  };
}

function reserveHeaderSpace(pageHeight: number, typography: BracketTypography) {
  const titleY = pageHeight - typography.headerTitleOffset;
  const divisionY = titleY - typography.headerDivisionOffset;
  const timeY = divisionY - typography.headerTimeOffset;
  const notesY = timeY - typography.headerNotesOffset;
  const roundHeaderY = notesY - typography.headerRoundOffset;
  const bracketTop = roundHeaderY - typography.headerBracketGap;

  return {
    titleY,
    divisionY,
    timeY,
    notesY,
    roundHeaderY,
    bracketTop,
  };
}

function computeLeafSlotMetrics(input: {
  bracketTop: number;
  bracketBottom: number;
  leafSlotCount: number;
  nameFontSize: number;
  nameLineGap: number;
}) {
  const availableBracketHeight = input.bracketTop - input.bracketBottom;
  const leafSlotHeight = availableBracketHeight / input.leafSlotCount;
  const halfGap = Math.max(
    BRACKET_MIN_HALF_GAP,
    leafSlotHeight / 2 - input.nameLineGap - input.nameFontSize,
  );

  return {
    availableBracketHeight,
    leafSlotHeight,
    halfGap,
  };
}

export function getBracketLayoutVerticalBounds(layout: BracketLayout) {
  let minY = layout.bracketBottom;
  let maxY = layout.bracketTop;

  for (const round of layout.rounds) {
    for (const match of round.matches) {
      minY = Math.min(minY, match.bottomY);
      minY = Math.min(
        minY,
        match.bottomTextBaselineY - layout.nameFontSize * TEXT_DESCENT_RATIO,
      );
      maxY = Math.max(maxY, match.topY);
      maxY = Math.max(
        maxY,
        match.topTextBaselineY + layout.nameFontSize * TEXT_ASCENT_RATIO,
      );
    }
  }

  return {
    minY,
    maxY,
  };
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
  bracketTop: number;
  leafSlotHeight: number;
}) {
  const matchSpan = input.leafSlotHeight * 2 ** input.mainRoundIndex;

  return (
    input.bracketTop -
    matchSpan * input.matchIndex -
    matchSpan / 2
  );
}

function layoutMatch(input: {
  match: BracketMatch;
  round: CompetitionBracket["rounds"][number];
  mainRoundIndex: number;
  bracket: CompetitionBracket;
  bracketTop: number;
  halfGap: number;
  nameLineStartX: number;
  nameLineEndX: number;
  connectorX: number;
  winnerLineEndX: number;
  competitorNameLineGap: number;
  leafSlotHeight: number;
  mainMatchCenters: Map<string, BracketLayoutMatch>;
}): BracketLayoutMatch {
  const halfGap = input.halfGap;
  let centerY = input.bracketTop / 2;

  if (!input.round.isPreliminary && input.mainRoundIndex >= 0) {
    centerY = layoutMainMatchCenterY({
      mainRoundIndex: input.mainRoundIndex,
      matchIndex: input.match.matchIndex,
      bracketTop: input.bracketTop,
      leafSlotHeight: input.leafSlotHeight,
    });
  } else if (input.round.isPreliminary) {
    centerY = layoutMainMatchCenterY({
      mainRoundIndex: 0,
      matchIndex: input.match.feedsMainMatchIndex ?? input.match.matchIndex,
      bracketTop: input.bracketTop,
      leafSlotHeight: input.leafSlotHeight,
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
    input.mainMatchCenters.set(`${input.match.matchIndex}`, layoutMatch);
  }

  return layoutMatch;
}

function buildBracketLayoutWithTypography(
  bracket: CompetitionBracket,
  typography: BracketTypography,
): BracketLayout {
  const page = resolvePageSize(bracket.mainBracketSize);
  const roundCount = bracket.rounds.length;
  const leafSlotCount = Math.max(bracket.mainBracketSize / 2, 1);
  const header = reserveHeaderSpace(page.height, typography);
  const bracketBottom = typography.marginBottom;
  const bracketTop = header.bracketTop;
  const { leafSlotHeight, halfGap } = computeLeafSlotMetrics({
    bracketTop,
    bracketBottom,
    leafSlotCount,
    nameFontSize: typography.nameFontSize,
    nameLineGap: typography.nameLineGap,
  });
  const bracketLeft = BRACKET_MARGIN_X;
  const bracketRight = page.width - BRACKET_MARGIN_X * 0.7;
  const bracketWidth = bracketRight - bracketLeft;
  const roundColumnWidth = bracketWidth / roundCount;
  const nameLineLength = Math.min(BRACKET_NAME_LINE_LENGTH, roundColumnWidth * 0.44);
  const connectorWidth = Math.min(BRACKET_CONNECTOR_WIDTH, roundColumnWidth * 0.15);
  const mainMatchCenters = new Map<string, BracketLayoutMatch>();

  const rounds = bracket.rounds.map((round, columnIndex) => {
    const columnX = bracketLeft + columnIndex * roundColumnWidth;
    const nameLineStartX = columnX + 10;
    const nameLineEndX = nameLineStartX + nameLineLength;
    const connectorX = nameLineEndX + connectorWidth;
    const winnerLineEndX =
      columnIndex === roundCount - 1
        ? connectorX + 8
        : columnX + roundColumnWidth - 8;
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
        halfGap,
        nameLineStartX,
        nameLineEndX,
        connectorX,
        winnerLineEndX,
        competitorNameLineGap: typography.nameLineGap,
        leafSlotHeight,
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

        prelimMatch.centerY = feederMain.centerY;
        prelimMatch.topY = feederMain.centerY + halfGap;
        prelimMatch.bottomY = feederMain.centerY - halfGap;
        prelimMatch.topTextBaselineY = prelimMatch.topY + typography.nameLineGap;
        prelimMatch.bottomTextBaselineY =
          prelimMatch.bottomY + typography.nameLineGap;
      }
    }
  }

  return {
    page,
    marginX: BRACKET_MARGIN_X,
    marginTop: page.height - header.titleY,
    marginBottom: bracketBottom,
    titleY: header.titleY,
    divisionY: header.divisionY,
    timeY: header.timeY,
    notesY: header.notesY,
    roundHeaderY: header.roundHeaderY,
    bracketTop,
    bracketBottom,
    bracketLeft,
    bracketRight,
    roundColumnWidth,
    nameLineLength,
    connectorWidth,
    nameFontSize: typography.nameFontSize,
    titleFontSize: typography.titleFontSize,
    metaFontSize: typography.metaFontSize,
    roundHeaderFontSize: typography.roundHeaderFontSize,
    lineThickness: BRACKET_LINE_THICKNESS,
    leafSlotCount,
    leafSlotHeight,
    competitorNameLineGap: typography.nameLineGap,
    rounds,
  };
}

function layoutFitsPage(layout: BracketLayout): boolean {
  const { minY, maxY } = getBracketLayoutVerticalBounds(layout);

  return (
    minY >= layout.bracketBottom - 0.5 &&
    maxY <= layout.bracketTop + 0.5 &&
    maxY <= layout.page.height - 8
  );
}

export function buildBracketLayout(bracket: CompetitionBracket): BracketLayout {
  let typography = defaultTypography();
  let layout = buildBracketLayoutWithTypography(bracket, typography);

  for (let attempt = 0; attempt < 40 && !layoutFitsPage(layout); attempt += 1) {
    typography = tightenTypography(typography);
    layout = buildBracketLayoutWithTypography(bracket, typography);
  }

  return layout;
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
