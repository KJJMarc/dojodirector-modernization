import type { BracketLayout } from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";
import { buildBracketLayout, getBracketTitleLines } from "@/lib/competition-bracket-layout.shared";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMatchSvg(
  match: BracketLayout["rounds"][number]["matches"][number],
  flipY: (y: number) => number,
) {
  const stroke = "#000000";
  const textClass = 'font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#000000"';

  const topName = escapeXml(match.topLabel || " ");
  const bottomName = escapeXml(match.bottomLabel || " ");
  const winnerName = escapeXml(match.winnerLabel || " ");

  return `
    <g data-match="${match.matchNumber}">
      <text x="${match.nameLineStartX}" y="${flipY(match.topY) - 3}" ${textClass}>${topName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.topY)}" stroke="${stroke}" stroke-width="1" />
      <text x="${match.nameLineStartX}" y="${flipY(match.bottomY) - 3}" ${textClass}>${bottomName}</text>
      <line x1="${match.nameLineStartX}" y1="${flipY(match.bottomY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="1" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.topY)}" x2="${match.nameLineEndX}" y2="${flipY(match.bottomY)}" stroke="${stroke}" stroke-width="1" />
      <line x1="${match.nameLineEndX}" y1="${flipY(match.centerY)}" x2="${match.winnerLineEndX}" y2="${flipY(match.centerY)}" stroke="${stroke}" stroke-width="1" />
      <text x="${match.connectorX + 4}" y="${flipY(match.centerY) - 3}" ${textClass} font-size="8">#${match.matchNumber}</text>
      ${
        match.winnerLabel
          ? `<text x="${match.connectorX + 4}" y="${flipY(match.centerY) + 8}" ${textClass} font-size="8">${winnerName}</text>`
          : ""
      }
    </g>
  `;
}

function renderFeederConnectors(
  layout: BracketLayout,
  flipY: (y: number) => number,
) {
  const stroke = "#000000";
  const segments: string[] = [];

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

      segments.push(
        `<line x1="${match.winnerLineEndX}" y1="${flipY(match.centerY)}" x2="${nextMatch.nameLineStartX}" y2="${flipY(targetY)}" stroke="${stroke}" stroke-width="1" />`,
      );
    }
  }

  return segments.join("\n");
}

export function renderBracketSvg(bracket: CompetitionBracket): string {
  const layout = buildBracketLayout(bracket);
  const titles = getBracketTitleLines(bracket);
  const { width, height } = layout.page;
  const flipY = (y: number) => height - y;

  const roundHeaders = layout.rounds
    .map(
      (round) =>
        `<text x="${round.columnX + layout.roundColumnWidth / 2}" y="${flipY(layout.titleY - 8)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#000000">${escapeXml(round.label)}</text>`,
    )
    .join("\n");
  const matches = layout.rounds
    .flatMap((round) =>
      round.matches.map((match) => renderMatchSvg(match, flipY)),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${layout.marginX}" y="${flipY(layout.titleY)}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="#000000">${escapeXml(titles.competitionName)}</text>
  <text x="${layout.marginX}" y="${flipY(layout.titleY - 22)}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#000000">${escapeXml(titles.divisionName)}</text>
  ${roundHeaders}
  ${matches}
  ${renderFeederConnectors(layout, flipY)}
</svg>`;
}
