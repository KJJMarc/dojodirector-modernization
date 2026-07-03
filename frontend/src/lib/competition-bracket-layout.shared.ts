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
  /** Vertical space allocated to each first-round match. */
  leafSlotHeight: number;
  /** Half the vertical distance between the two competitor lines of a match. */
  matchHalfGap: number;
  competitorNameLineGap: number;
  rounds: {
    label: string;
    roundIndex: number;
    isPreliminary: boolean;
    columnX: number;
    matches: BracketLayoutMatch[];
  }[];
}

export const BRACKET_COMPETITOR_NAME_LINE_GAP = 7;

// Fixed header geometry (measured down from the top of the page). The header is
// reserved first and never scaled, so the bracket always renders in the space
// that remains below it.
const HEADER_TITLE_FONT_SIZE = 20;
const HEADER_META_FONT_SIZE = 11.5;
const HEADER_ROUND_FONT_SIZE = 13.5;
const HEADER_TITLE_OFFSET = 30;
const HEADER_DIVISION_GAP = 22;
const HEADER_TIME_GAP = 16;
const HEADER_NOTES_GAP = 16;
const HEADER_ROUND_GAP = 26;
const HEADER_BRACKET_GAP = 16;

const MARGIN_X = 44;
const MARGIN_BOTTOM = 34;
const LINE_THICKNESS = 1;

// Base typography for the bracket body. When a dense bracket does not fit in the
// available height these values are reduced together until it does.
const NAME_FONT_SIZE_BASE = 11;
const NAME_FONT_SIZE_MIN = 6.5;
const NAME_LINE_GAP_BASE = BRACKET_COMPETITOR_NAME_LINE_GAP;
const NAME_LINE_GAP_MIN = 3.5;
const MATCH_HALF_GAP_BASE = 16;
const MATCH_HALF_GAP_MIN = 3;
const TYPOGRAPHY_STEP = 0.95;
// Approximate cap height ratio for Helvetica, used to keep the tallest name
// glyphs inside the printable area.
const NAME_ASCENT_RATIO = 0.72;

interface BracketTypography {
  nameFontSize: number;
  nameLineGap: number;
  matchHalfGap: number;
}

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

export function getBracketLayoutVerticalBounds(layout: BracketLayout) {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const ascent = layout.nameFontSize * NAME_ASCENT_RATIO;

  for (const round of layout.rounds) {
    for (const match of round.matches) {
      minY = Math.min(minY, match.bottomY, match.topY);
      maxY = Math.max(
        maxY,
        match.topY,
        match.topTextBaselineY + ascent,
        match.bottomTextBaselineY + ascent,
      );
    }
  }

  return {
    minY: Number.isFinite(minY) ? minY : layout.bracketBottom,
    maxY: Number.isFinite(maxY) ? maxY : layout.bracketTop,
  };
}

interface BracketFrame {
  page: BracketPageSize;
  marginX: number;
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
  availableHeight: number;
  leafCount: number;
}

function buildFrame(bracket: CompetitionBracket): BracketFrame {
  const page = resolvePageSize(bracket.mainBracketSize);
  const roundCount = Math.max(bracket.rounds.length, 1);

  const titleY = page.height - HEADER_TITLE_OFFSET;
  const divisionY = titleY - HEADER_DIVISION_GAP;
  const timeY = divisionY - HEADER_TIME_GAP;
  const notesY = timeY - HEADER_NOTES_GAP;
  const roundHeaderY = notesY - HEADER_ROUND_GAP;
  const bracketTop = roundHeaderY - HEADER_BRACKET_GAP;
  const bracketBottom = MARGIN_BOTTOM;

  const bracketLeft = MARGIN_X;
  const bracketRight = page.width - MARGIN_X * 0.6;
  const roundColumnWidth = (bracketRight - bracketLeft) / roundCount;
  const nameLineLength = Math.min(140, roundColumnWidth * 0.5);
  const connectorWidth = Math.min(30, roundColumnWidth * 0.14);

  return {
    page,
    marginX: MARGIN_X,
    marginBottom: MARGIN_BOTTOM,
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
    availableHeight: bracketTop - bracketBottom,
    leafCount: Math.max(bracket.mainBracketSize / 2, 1),
  };
}

function mainMatchCenterY(
  frame: BracketFrame,
  leafSlotHeight: number,
  mainRoundIndex: number,
  matchIndex: number,
) {
  const span = leafSlotHeight * 2 ** mainRoundIndex;

  return frame.bracketTop - span * matchIndex - span / 2;
}

function layoutRoundsForTypography(
  bracket: CompetitionBracket,
  frame: BracketFrame,
  typography: BracketTypography,
): { rounds: BracketLayout["rounds"]; leafSlotHeight: number; matchHalfGap: number } {
  const roundCount = Math.max(bracket.rounds.length, 1);
  const leafSlotHeight = frame.availableHeight / frame.leafCount;
  const maxHalfGap =
    (leafSlotHeight - typography.nameLineGap - typography.nameFontSize) / 2;
  const matchHalfGap = Math.max(
    MATCH_HALF_GAP_MIN,
    Math.min(typography.matchHalfGap, maxHalfGap),
  );

  // Preliminary matches sit slightly tighter than main matches so that two
  // play-ins feeding the top and bottom slot of the same main match (e.g. 7 or
  // 15 entrants) never overlap.
  const prelimHalfGap = Math.max(MATCH_HALF_GAP_MIN, matchHalfGap * 0.5);
  const mainMatchCenters = new Map<number, number>();

  const rounds = bracket.rounds.map((round, columnIndex) => {
    const columnX = frame.bracketLeft + columnIndex * frame.roundColumnWidth;
    const nameLineStartX = columnX + 8;
    const nameLineEndX = nameLineStartX + frame.nameLineLength;
    const connectorX = nameLineEndX + frame.connectorWidth;
    const winnerLineEndX =
      columnIndex === roundCount - 1
        ? connectorX + 8
        : columnX + frame.roundColumnWidth - 8;
    const mainRoundIndex = getMainRoundIndex(
      bracket,
      round.roundIndex,
      round.isPreliminary,
    );

    const matches = round.matches.map((match) => {
      const centerY = resolveMatchCenterY({
        match,
        isPreliminary: round.isPreliminary,
        mainRoundIndex,
        frame,
        leafSlotHeight,
        matchHalfGap,
        mainMatchCenters,
      });

      const halfGap = round.isPreliminary ? prelimHalfGap : matchHalfGap;
      const topY = centerY + halfGap;
      const bottomY = centerY - halfGap;

      const layoutMatch: BracketLayoutMatch = {
        matchIndex: match.matchIndex,
        roundIndex: round.roundIndex,
        isPreliminary: round.isPreliminary,
        roundLabel: round.label,
        topLabel: displayParticipantLabel(match.top),
        bottomLabel: displayParticipantLabel(match.bottom),
        topY,
        bottomY,
        topTextBaselineY: topY + typography.nameLineGap,
        bottomTextBaselineY: bottomY + typography.nameLineGap,
        centerY,
        nameLineStartX,
        nameLineEndX,
        connectorX,
        winnerLineEndX,
        feedsMainMatchIndex: match.feedsMainMatchIndex,
        feedsMainSlot: match.feedsMainSlot,
      };

      if (!round.isPreliminary && mainRoundIndex === 0) {
        mainMatchCenters.set(match.matchIndex, centerY);
      }

      return layoutMatch;
    });

    return {
      label: round.label,
      roundIndex: round.roundIndex,
      isPreliminary: round.isPreliminary,
      columnX,
      matches,
    };
  });

  return { rounds, leafSlotHeight, matchHalfGap };
}

function resolveMatchCenterY(input: {
  match: BracketMatch;
  isPreliminary: boolean;
  mainRoundIndex: number;
  frame: BracketFrame;
  leafSlotHeight: number;
  matchHalfGap: number;
  mainMatchCenters: Map<number, number>;
}): number {
  const { match, isPreliminary, mainRoundIndex, frame, leafSlotHeight } = input;

  if (isPreliminary) {
    const feederIndex = match.feedsMainMatchIndex ?? match.matchIndex;
    const feederCenter =
      input.mainMatchCenters.get(feederIndex) ??
      mainMatchCenterY(frame, leafSlotHeight, 0, feederIndex);

    // Centre the play-in on the exact slot line it feeds so its winner line
    // continues straight into the main match, and so two play-ins feeding the
    // same main match land on separate (top/bottom) lines.
    return match.feedsMainSlot === "bottom"
      ? feederCenter - input.matchHalfGap
      : feederCenter + input.matchHalfGap;
  }

  if (mainRoundIndex >= 0) {
    return mainMatchCenterY(
      frame,
      leafSlotHeight,
      mainRoundIndex,
      match.matchIndex,
    );
  }

  return frame.bracketTop - frame.availableHeight / 2;
}

function measureBounds(
  rounds: BracketLayout["rounds"],
  nameFontSize: number,
): { minY: number; maxY: number } {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const ascent = nameFontSize * NAME_ASCENT_RATIO;

  for (const round of rounds) {
    for (const match of round.matches) {
      minY = Math.min(minY, match.bottomY, match.topY);
      maxY = Math.max(
        maxY,
        match.topY,
        match.topTextBaselineY + ascent,
        match.bottomTextBaselineY + ascent,
      );
    }
  }

  return { minY, maxY };
}

function buildTypographySteps(): BracketTypography[] {
  const steps: BracketTypography[] = [];
  let nameFontSize = NAME_FONT_SIZE_BASE;
  let nameLineGap = NAME_LINE_GAP_BASE;
  let matchHalfGap = MATCH_HALF_GAP_BASE;

  while (nameFontSize >= NAME_FONT_SIZE_MIN - 0.01) {
    steps.push({ nameFontSize, nameLineGap, matchHalfGap });
    nameFontSize *= TYPOGRAPHY_STEP;
    nameLineGap = Math.max(NAME_LINE_GAP_MIN, nameLineGap * TYPOGRAPHY_STEP);
    matchHalfGap = Math.max(MATCH_HALF_GAP_MIN, matchHalfGap * TYPOGRAPHY_STEP);
  }

  return steps;
}

export function buildBracketLayout(bracket: CompetitionBracket): BracketLayout {
  const frame = buildFrame(bracket);
  const steps = buildTypographySteps();

  let chosen = steps[0];
  let chosenLayout = layoutRoundsForTypography(bracket, frame, chosen);

  for (const typography of steps) {
    const candidate = layoutRoundsForTypography(bracket, frame, typography);
    const { minY, maxY } = measureBounds(
      candidate.rounds,
      typography.nameFontSize,
    );

    chosen = typography;
    chosenLayout = candidate;

    if (minY >= frame.bracketBottom - 0.5 && maxY <= frame.bracketTop + 0.5) {
      break;
    }
  }

  return {
    page: frame.page,
    marginX: frame.marginX,
    marginTop: frame.page.height - frame.titleY,
    marginBottom: frame.marginBottom,
    titleY: frame.titleY,
    divisionY: frame.divisionY,
    timeY: frame.timeY,
    notesY: frame.notesY,
    roundHeaderY: frame.roundHeaderY,
    bracketTop: frame.bracketTop,
    bracketBottom: frame.bracketBottom,
    bracketLeft: frame.bracketLeft,
    bracketRight: frame.bracketRight,
    roundColumnWidth: frame.roundColumnWidth,
    nameLineLength: frame.nameLineLength,
    connectorWidth: frame.connectorWidth,
    nameFontSize: chosen.nameFontSize,
    titleFontSize: HEADER_TITLE_FONT_SIZE,
    metaFontSize: HEADER_META_FONT_SIZE,
    roundHeaderFontSize: HEADER_ROUND_FONT_SIZE,
    lineThickness: LINE_THICKNESS,
    leafSlotHeight: chosenLayout.leafSlotHeight,
    matchHalfGap: chosenLayout.matchHalfGap,
    competitorNameLineGap: chosen.nameLineGap,
    rounds: chosenLayout.rounds,
  };
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
