import type { BracketLayout } from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";
import {
  BRACKET_FONT_FAMILY,
  buildBracketLayout,
  findFeederConnectorTargets,
  getBracketTitleLines,
} from "@/lib/competition-bracket-layout.shared";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMatchSvg(
  match: BracketLayout["rounds"][number]["matches"][number],
  layout: BracketLayout,
  flipY: (y: number) => number,
) {
  const stroke = "#000000";
  const textStyle = `font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.nameFontSize}" fill="#000000"`;
  const topName = escapeXml(match.topLabel || " ");
  const bottomName = escapeXml(match.bottomLabel || " ");

  return `
    <g data-match="${match.matchNumber}">
      <text x="${match.nameLineStartX}" y="${flipY(match.topY) - 4}" ${textStyle}>${topName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.topY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <text x="${match.nameLineStartX}" y="${flipY(match.bottomY) - 4}" ${textStyle}>${bottomName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.bottomY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.centerY)}" x2="${match.winnerLineEndX}" y2="${flipY(match.centerY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <text x="${match.connectorX + 4}" y="${flipY(match.centerY) - 2}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.nameFontSize - 2}" fill="#000000">#${match.matchNumber}</text>
    </g>
  `;
}

export function renderBracketSvg(bracket: CompetitionBracket): string {
  const layout = buildBracketLayout(bracket);
  const titles = getBracketTitleLines(bracket);
  const { width, height } = layout.page;
  const flipY = (y: number) => height - y;

  const roundHeaders = layout.rounds
    .map((round) => {
      const labelWidthEstimate = round.label.length * layout.roundHeaderFontSize * 0.55;
      return `<text x="${round.columnX + layout.roundColumnWidth / 2 - labelWidthEstimate / 2}" y="${flipY(layout.roundHeaderY)}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.roundHeaderFontSize}" font-weight="700" fill="#000000">${escapeXml(round.label)}</text>`;
    })
    .join("\n");

  const matches = layout.rounds
    .flatMap((round) =>
      round.matches.map((match) => renderMatchSvg(match, layout, flipY)),
    )
    .join("\n");

  const connectors = findFeederConnectorTargets(layout)
    .map(
      (segment) =>
        `<line x1="${segment.x1}" y1="${flipY(segment.y1)}" x2="${segment.x2}" y2="${flipY(segment.y2)}" stroke="#000000" stroke-width="${layout.lineThickness}" />`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${layout.marginX}" y="${flipY(layout.titleY)}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.titleFontSize}" font-weight="700" fill="#000000">${escapeXml(titles.competitionName)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.divisionY)}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.metaFontSize}" fill="#000000">${escapeXml(titles.divisionName)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.timeY)}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.metaFontSize}" fill="#000000">${escapeXml(titles.timeLine)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.notesY)}" font-family="${BRACKET_FONT_FAMILY}" font-size="${layout.metaFontSize}" fill="#000000">${escapeXml(titles.notesLine)}</text>
  ${roundHeaders}
  ${matches}
  ${connectors}
</svg>`;
}
