import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import {
  buildBracketLayout,
  getBracketTitleLines,
  type BracketLayout,
  type BracketLayoutMatch,
} from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: BLACK,
    thickness: 1,
  });
}

function drawLabel(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 9,
) {
  const value = text.trim() || " ";

  page.drawText(value, {
    x,
    y,
    size,
    font,
    color: BLACK,
  });
}

function drawMatch(
  page: PDFPage,
  match: BracketLayoutMatch,
  font: PDFFont,
  bold: PDFFont,
) {
  drawLabel(page, match.topLabel, match.nameLineStartX, match.topY - 2, font);
  drawLine(
    page,
    match.nameLineStartX,
    match.topY,
    match.nameLineEndX,
    match.topY,
  );
  drawLabel(page, match.bottomLabel, match.nameLineStartX, match.bottomY - 2, font);
  drawLine(
    page,
    match.nameLineStartX,
    match.bottomY,
    match.nameLineEndX,
    match.bottomY,
  );
  drawLine(
    page,
    match.nameLineEndX,
    match.topY,
    match.nameLineEndX,
    match.bottomY,
  );
  drawLine(
    page,
    match.nameLineEndX,
    match.centerY,
    match.winnerLineEndX,
    match.centerY,
  );
  drawLabel(
    page,
    `#${match.matchNumber}`,
    match.connectorX + 2,
    match.centerY - 2,
    font,
    7,
  );

  if (match.winnerLabel) {
    drawLabel(
      page,
      match.winnerLabel,
      match.connectorX + 2,
      match.centerY + 8,
      font,
      7,
    );
  }
}

function drawFeederConnectors(page: PDFPage, layout: BracketLayout) {
  for (let roundIndex = 0; roundIndex < layout.rounds.length - 1; roundIndex += 1) {
    const currentRound = layout.rounds[roundIndex];
    const nextRound = layout.rounds[roundIndex + 1];

    for (const match of currentRound.matches) {
      const nextMatch = nextRound.matches[Math.floor(match.matchIndex / 2)];

      if (!nextMatch) {
        continue;
      }

      const targetY =
        match.matchIndex % 2 === 0 ? nextMatch.topY : nextMatch.bottomY;

      drawLine(
        page,
        match.winnerLineEndX,
        match.centerY,
        nextMatch.nameLineStartX,
        targetY,
      );
    }
  }
}

function drawBracketPage(
  pdf: PDFDocument,
  bracket: CompetitionBracket,
  regular: PDFFont,
  bold: PDFFont,
) {
  const layout = buildBracketLayout(bracket);
  const titles = getBracketTitleLines(bracket);
  const page = pdf.addPage([layout.page.width, layout.page.height]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: layout.page.width,
    height: layout.page.height,
    color: WHITE,
  });

  page.drawText(titles.competitionName, {
    x: layout.marginX,
    y: layout.titleY,
    size: 18,
    font: bold,
    color: BLACK,
  });
  page.drawText(titles.divisionName, {
    x: layout.marginX,
    y: layout.titleY - 20,
    size: 11,
    font: regular,
    color: BLACK,
  });

  for (const round of layout.rounds) {
    const labelWidth = bold.widthOfTextAtSize(round.label, 10);
    page.drawText(round.label, {
      x: round.columnX + layout.roundColumnWidth / 2 - labelWidth / 2,
      y: layout.titleY - 36,
      size: 10,
      font: bold,
      color: BLACK,
    });

    for (const match of round.matches) {
      drawMatch(page, match, regular, bold);
    }
  }

  drawFeederConnectors(page, layout);
}

export async function buildCompetitionBracketPdfBytes(
  bracket: CompetitionBracket,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  drawBracketPage(pdf, bracket, regular, bold);

  return pdf.save();
}

export async function buildCompetitionBracketsPdfBytes(
  brackets: CompetitionBracket[],
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const bracket of brackets) {
    drawBracketPage(pdf, bracket, regular, bold);
  }

  return pdf.save();
}
