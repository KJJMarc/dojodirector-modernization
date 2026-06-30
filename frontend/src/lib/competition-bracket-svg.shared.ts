import type { BracketLayout } from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";
import {
  BRACKET_FONT_FAMILY,
  buildBracketLayout,
  findFeederConnectorTargets,
  getBracketTitleLines,
} from "@/lib/competition-bracket-layout.shared";

export function escapeSvgText(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeSvgAttribute(value: string | number): string {
  return escapeSvgText(String(value));
}

function svgFontFamilyAttribute(): string {
  return `font-family="${escapeSvgAttribute(BRACKET_FONT_FAMILY)}"`;
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
  flipY: (y: number) => number,
) {
  const stroke = "#000000";
  const textStyle = `${svgFontFamilyAttribute()} font-size="${layout.nameFontSize}" fill="#000000"`;
  const topName = escapeSvgText(match.topLabel || " ");
  const bottomName = escapeSvgText(match.bottomLabel || " ");

  return `
    <g data-match="${escapeSvgAttribute(match.matchNumber)}">
      <text x="${match.nameLineStartX}" y="${flipY(match.topY) - 4}" ${textStyle}>${topName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.topY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <text x="${match.nameLineStartX}" y="${flipY(match.bottomY) - 4}" ${textStyle}>${bottomName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.bottomY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.centerY)}" x2="${match.winnerLineEndX}" y2="${flipY(match.centerY)}" stroke="${stroke}" stroke-width="${layout.lineThickness}" />
      <text x="${match.connectorX + 4}" y="${flipY(match.centerY) - 2}" ${svgFontFamilyAttribute()} font-size="${layout.nameFontSize - 2}" fill="#000000">#${escapeSvgText(String(match.matchNumber))}</text>
    </g>
  `;
}

export function renderBracketSvg(bracket: CompetitionBracket): string {
  const layout = buildBracketLayout(bracket);
  const titles = getBracketTitleLines(bracket);
  const { width, height } = layout.page;
  const flipY = (y: number) => height - y;
  const headerFont = `${svgFontFamilyAttribute()} font-size="${layout.roundHeaderFontSize}" font-weight="700" fill="#000000"`;
  const titleFont = `${svgFontFamilyAttribute()} font-size="${layout.titleFontSize}" font-weight="700" fill="#000000"`;
  const metaFont = `${svgFontFamilyAttribute()} font-size="${layout.metaFontSize}" fill="#000000"`;

  const roundHeaders = layout.rounds
    .map((round) => {
      const labelWidthEstimate =
        round.label.length * layout.roundHeaderFontSize * 0.55;
      return `<text x="${round.columnX + layout.roundColumnWidth / 2 - labelWidthEstimate / 2}" y="${flipY(layout.roundHeaderY)}" ${headerFont}>${escapeSvgText(round.label)}</text>`;
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

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${layout.marginX}" y="${flipY(layout.titleY)}" ${titleFont}>${escapeSvgText(titles.competitionName)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.divisionY)}" ${metaFont}>${escapeSvgText(titles.divisionName)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.timeY)}" ${metaFont}>${escapeSvgText(titles.timeLine)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.notesY)}" ${metaFont}>${escapeSvgText(titles.notesLine)}</text>
  ${roundHeaders}
  ${matches}
  ${connectors}
</svg>`;

  validateBracketSvg(svg);

  return svg;
}
