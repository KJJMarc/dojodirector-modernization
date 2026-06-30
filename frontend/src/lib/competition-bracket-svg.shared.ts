import type { BracketLayout } from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";
import {
  bracketRoundHeaderX,
  bracketSvgTextBaselineY,
  buildBracketLayout,
  findFeederConnectorTargets,
  getBracketTitleLines,
} from "@/lib/competition-bracket-layout.shared";

const BRACKET_SVG_FONT_FAMILY = "Helvetica, Arial, sans-serif";

export function escapeSvgText(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function validateBracketSvg(svg: string): void {
  const trimmed = svg.trim();

  if (!trimmed.includes("<svg") || !trimmed.endsWith("</svg>")) {
    throw new Error("Invalid bracket SVG document.");
  }

  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(svg)) {
    throw new Error("Invalid bracket SVG: unescaped ampersand.");
  }

  const textNodePattern = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textNodePattern.exec(svg)) !== null) {
    const content = match[1];
    const withoutEntities = content.replace(
      /&(?:amp|lt|gt|quot|apos);/g,
      "",
    );

    if (/[<>&]/.test(withoutEntities)) {
      throw new Error("Invalid bracket SVG: unescaped text content.");
    }
  }
}

function renderMatchSvg(
  match: BracketLayout["rounds"][number]["matches"][number],
  layout: BracketLayout,
  pageHeight: number,
) {
  const stroke = "#000000";
  const textStyle = `font-family="${BRACKET_SVG_FONT_FAMILY}" font-size="${layout.nameFontSize}" fill="#000000"`;
  const topName = escapeSvgText(match.topLabel || " ");
  const bottomName = escapeSvgText(match.bottomLabel || " ");
  const topTextY = bracketSvgTextBaselineY(match.topTextBaselineY, pageHeight);
  const bottomTextY = bracketSvgTextBaselineY(
    match.bottomTextBaselineY,
    pageHeight,
  );
  const topLineY = bracketSvgTextBaselineY(match.topY, pageHeight);
  const bottomLineY = bracketSvgTextBaselineY(match.bottomY, pageHeight);
  const centerLineY = bracketSvgTextBaselineY(match.centerY, pageHeight);

  return `
    <g>
      <text x="${match.nameLineStartX}" y="${topTextY}" ${textStyle}>${topName}</text>
      <line x1="${match.nameLineStartX}" y1="${topLineY}" x2="${match.nameLineEndX}" y2="${topLineY}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <text x="${match.nameLineStartX}" y="${bottomTextY}" ${textStyle}>${bottomName}</text>
      <line x1="${match.nameLineStartX}" y1="${bottomLineY}" x2="${match.nameLineEndX}" y2="${bottomLineY}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${topLineY}" x2="${match.nameLineEndX}" y2="${bottomLineY}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${centerLineY}" x2="${match.winnerLineEndX}" y2="${centerLineY}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
    </g>
  `;
}

export function renderBracketSvg(bracket: CompetitionBracket): string {
  const layout = buildBracketLayout(bracket);
  const titles = getBracketTitleLines(bracket);
  const { width, height } = layout.page;
  const headerFont = `font-family="${BRACKET_SVG_FONT_FAMILY}" font-size="${layout.roundHeaderFontSize}" font-weight="700" fill="#000000"`;
  const titleFont = `font-family="${BRACKET_SVG_FONT_FAMILY}" font-size="${layout.titleFontSize}" font-weight="700" fill="#000000"`;
  const metaFont = `font-family="${BRACKET_SVG_FONT_FAMILY}" font-size="${layout.metaFontSize}" fill="#000000"`;

  const roundHeaders = layout.rounds
    .map((round) => {
      const headerX = bracketRoundHeaderX(
        round.columnX,
        layout.roundColumnWidth,
        round.label,
        layout.roundHeaderFontSize,
      );

      return `<text x="${headerX}" y="${bracketSvgTextBaselineY(layout.roundHeaderY, height)}" ${headerFont}>${escapeSvgText(round.label)}</text>`;
    })
    .join("\n");

  const matches = layout.rounds
    .flatMap((round) =>
      round.matches.map((match) => renderMatchSvg(match, layout, height)),
    )
    .join("\n");

  const connectors = findFeederConnectorTargets(layout)
    .map(
      (segment) =>
        `<line x1="${segment.x1}" y1="${bracketSvgTextBaselineY(segment.y1, height)}" x2="${segment.x2}" y2="${bracketSvgTextBaselineY(segment.y2, height)}" stroke="#000000" stroke-width="${layout.lineThickness}" />`,
    )
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${layout.marginX}" y="${bracketSvgTextBaselineY(layout.titleY, height)}" ${titleFont}>${escapeSvgText(titles.competitionName)}</text>
  <text x="${layout.marginX}" y="${bracketSvgTextBaselineY(layout.divisionY, height)}" ${metaFont}>${escapeSvgText(titles.divisionName)}</text>
  <text x="${layout.marginX}" y="${bracketSvgTextBaselineY(layout.timeY, height)}" ${metaFont}>${escapeSvgText(titles.timeLine)}</text>
  <text x="${layout.marginX}" y="${bracketSvgTextBaselineY(layout.notesY, height)}" ${metaFont}>${escapeSvgText(titles.notesLine)}</text>
  ${roundHeaders}
  ${matches}
  ${connectors}
</svg>`;

  validateBracketSvg(svg);

  return svg;
}
