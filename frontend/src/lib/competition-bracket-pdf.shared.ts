import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import {
  bracketRoundHeaderX,
  buildBracketLayout,
  findFeederConnectorTargets,
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
  thickness: number,
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: BLACK,
    thickness,
  });
}

function drawLabel(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
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
  layout: BracketLayout,
  font: PDFFont,
) {
  drawLabel(
    page,
    match.topLabel,
    match.nameLineStartX,
    match.topTextBaselineY,
    font,
    layout.nameFontSize,
  );
  drawLine(
    page,
    match.nameLineStartX,
    match.topY,
    match.nameLineEndX,
    match.topY,
    layout.lineThickness,
  );
  drawLabel(
    page,
    match.bottomLabel,
    match.nameLineStartX,
    match.bottomTextBaselineY,
    font,
    layout.nameFontSize,
  );
  drawLine(
    page,
    match.nameLineStartX,
    match.bottomY,
    match.nameLineEndX,
    match.bottomY,
    layout.lineThickness,
  );
  drawLine(
    page,
    match.nameLineEndX,
    match.topY,
    match.nameLineEndX,
    match.bottomY,
    layout.lineThickness,
  );
  drawLine(
    page,
    match.nameLineEndX,
    match.centerY,
    match.winnerLineEndX,
    match.centerY,
    layout.lineThickness,
  );
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
    size: layout.titleFontSize,
    font: bold,
    color: BLACK,
  });
  page.drawText(titles.divisionName, {
    x: layout.marginX,
    y: layout.divisionY,
    size: layout.metaFontSize,
    font: regular,
    color: BLACK,
  });
  page.drawText(titles.timeLine, {
    x: layout.marginX,
    y: layout.timeY,
    size: layout.metaFontSize,
    font: regular,
    color: BLACK,
  });
  page.drawText(titles.notesLine, {
    x: layout.marginX,
    y: layout.notesY,
    size: layout.metaFontSize,
    font: regular,
    color: BLACK,
  });

  for (const round of layout.rounds) {
    page.drawText(round.label, {
      x: bracketRoundHeaderX(
        round.columnX,
        layout.roundColumnWidth,
        round.label,
        layout.roundHeaderFontSize,
      ),
      y: layout.roundHeaderY,
      size: layout.roundHeaderFontSize,
      font: bold,
      color: BLACK,
    });

    for (const match of round.matches) {
      drawMatch(page, match, layout, regular);
    }
  }

  for (const segment of findFeederConnectorTargets(layout)) {
    drawLine(
      page,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2,
      layout.lineThickness,
    );
  }
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
