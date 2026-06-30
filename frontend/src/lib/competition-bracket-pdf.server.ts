import "server-only";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { buildBracketLayout } from "@/lib/competition-bracket-layout.shared";
import type { CompetitionBracket } from "@/lib/competition-bracket.shared";
import { renderBracketSvg } from "@/lib/competition-bracket-svg.shared";

const PDF_RASTER_SCALE = 2;

export async function buildCompetitionBracketPdfBytes(
  bracket: CompetitionBracket,
) {
  const layout = buildBracketLayout(bracket);
  const svg = renderBracketSvg(bracket);
  const pageWidth = layout.page.width;
  const pageHeight = layout.page.height;
  const rasterWidth = Math.round(pageWidth * PDF_RASTER_SCALE);
  const rasterHeight = Math.round(pageHeight * PDF_RASTER_SCALE);

  const pngBytes = await sharp(Buffer.from(svg))
    .resize(rasterWidth, rasterHeight, { fit: "fill" })
    .png()
    .toBuffer();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const pngImage = await pdf.embedPng(pngBytes);

  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  return pdf.save();
}
