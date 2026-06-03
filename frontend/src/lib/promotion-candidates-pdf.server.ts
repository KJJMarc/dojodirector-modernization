import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  formatPromotionProgressLabel,
  formatPromotionRequiredTimeLabel,
  formatPromotionTimeSinceLabel,
  type PromotionCandidate,
} from "@/lib/admin-belt-promotion.shared";
import { PROMOTION_CANDIDATES_REPORT_TITLE } from "@/lib/promotion-candidates-pdf.shared";

/** Promotion Candidates PDF export v1.0 layout (landscape, dark header band). */
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN_X = 36;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 36;
const BODY_SIZE = 8;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 11;
const META_SIZE = 9;
const ROW_HEIGHT = 14;
const HEADER_BAND_HEIGHT = 72;

const DOJO_RED = rgb(0.72, 0.11, 0.11);
const HEADER_BACKGROUND = rgb(1, 1, 1);
const HEADER_TEXT = rgb(0, 0, 0);
const DOJO_DARK = rgb(0.08, 0.08, 0.08);
const DOJO_MUTED = rgb(0.35, 0.35, 0.35);
const TABLE_HEADER_BG = rgb(0.92, 0.92, 0.92);
const TABLE_ROW_ALT = rgb(0.97, 0.97, 0.97);
const TABLE_BORDER = rgb(0.82, 0.82, 0.82);

const TABLE_COLUMNS = [
  { label: "Name", width: 150 },
  { label: "Current belt", width: 100 },
  { label: "Suggested next", width: 100 },
  { label: "Attendance", width: 80 },
  { label: "Req. att.", width: 58 },
  { label: "Time since", width: 80 },
  { label: "Req. time", width: 58 },
] as const;

export interface PromotionCandidatesPdfInput {
  pageTitle: string;
  academyName: string;
  generatedAt: string;
  searchQuery?: string;
  candidates: PromotionCandidate[];
}

function truncateText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
) {
  const trimmed = text.trim() || "—";

  if (font.widthOfTextAtSize(trimmed, fontSize) <= maxWidth) {
    return trimmed;
  }

  let value = trimmed;

  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, fontSize) > maxWidth) {
    value = value.slice(0, -1);
  }

  return `${value}…`;
}

function formatGeneratedDateForPdf(isoTimestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(isoTimestamp));
}

function getColumnXPositions() {
  const positions: number[] = [];
  let x = MARGIN_X;

  for (const column of TABLE_COLUMNS) {
    positions.push(x);
    x += column.width;
  }

  return positions;
}

class LandscapePdfWriter {
  private y = PAGE_HEIGHT - MARGIN_TOP;
  private page: PDFPage;

  constructor(
    private readonly pdf: PDFDocument,
    page: PDFPage,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = page;
  }

  private addPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  private ensureSpace(lineCount: number) {
    if (this.y - lineCount * ROW_HEIGHT >= MARGIN_BOTTOM) {
      return;
    }

    this.addPage();
  }

  drawHeader(input: PromotionCandidatesPdfInput) {
    const pageTitle = input.pageTitle.trim() || PROMOTION_CANDIDATES_REPORT_TITLE;

    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
      width: PAGE_WIDTH,
      height: HEADER_BAND_HEIGHT,
      color: HEADER_BACKGROUND,
    });

    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
      width: 6,
      height: HEADER_BAND_HEIGHT,
      color: DOJO_RED,
    });

    this.page.drawText(pageTitle, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 30,
      size: TITLE_SIZE,
      font: this.bold,
      color: HEADER_TEXT,
    });

    this.page.drawText(input.academyName, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 48,
      size: SUBTITLE_SIZE,
      font: this.regular,
      color: HEADER_TEXT,
    });

    const generatedLabel = `Generated: ${formatGeneratedDateForPdf(input.generatedAt)}`;
    this.page.drawText(generatedLabel, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 62,
      size: META_SIZE,
      font: this.regular,
      color: HEADER_TEXT,
    });

    const countLabel = `Total promotion candidates: ${input.candidates.length}`;
    this.page.drawText(countLabel, {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        this.bold.widthOfTextAtSize(countLabel, META_SIZE),
      y: PAGE_HEIGHT - 62,
      size: META_SIZE,
      font: this.bold,
      color: HEADER_TEXT,
    });

    if (input.searchQuery?.trim()) {
      const filterLabel = `Filter: ${input.searchQuery.trim()}`;
      this.page.drawText(filterLabel, {
        x: MARGIN_X,
        y: PAGE_HEIGHT - 76,
        size: META_SIZE,
        font: this.regular,
        color: HEADER_TEXT,
      });
    }

    this.y = PAGE_HEIGHT - HEADER_BAND_HEIGHT - 18;
  }

  drawTableHeader() {
    this.ensureSpace(2);
    const columnX = getColumnXPositions();
    const headerY = this.y;

    this.page.drawRectangle({
      x: MARGIN_X,
      y: headerY - ROW_HEIGHT + 4,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: ROW_HEIGHT,
      color: TABLE_HEADER_BG,
      borderColor: TABLE_BORDER,
      borderWidth: 0.5,
    });

    TABLE_COLUMNS.forEach((column, index) => {
      this.page.drawText(column.label, {
        x: columnX[index] + 4,
        y: headerY - 9,
        size: BODY_SIZE,
        font: this.bold,
        color: DOJO_DARK,
      });
    });

    this.y -= ROW_HEIGHT + 2;
  }

  drawCandidateRow(candidate: PromotionCandidate, rowIndex: number) {
    this.ensureSpace(2);
    const columnX = getColumnXPositions();
    const rowY = this.y;
    const rowBackground = rowIndex % 2 === 0 ? rgb(1, 1, 1) : TABLE_ROW_ALT;

    this.page.drawRectangle({
      x: MARGIN_X,
      y: rowY - ROW_HEIGHT + 4,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: ROW_HEIGHT,
      color: rowBackground,
      borderColor: TABLE_BORDER,
      borderWidth: 0.25,
    });

    const cells = [
      candidate.fullName,
      candidate.assessment.currentBeltLabel,
      candidate.assessment.nextBeltLabel,
      formatPromotionProgressLabel(
        candidate.assessment.attendanceSinceAward,
        candidate.assessment.requiredAttendance,
      ),
      String(candidate.assessment.requiredAttendance),
      formatPromotionTimeSinceLabel(candidate.assessment),
      formatPromotionRequiredTimeLabel(candidate.assessment),
    ];

    cells.forEach((value, index) => {
      const column = TABLE_COLUMNS[index];
      const text = truncateText(value, column.width - 8, this.regular, BODY_SIZE);

      this.page.drawText(text, {
        x: columnX[index] + 4,
        y: rowY - 9,
        size: BODY_SIZE,
        font: this.regular,
        color: DOJO_DARK,
      });
    });

    this.y -= ROW_HEIGHT;
  }

  drawEmptyState() {
    this.ensureSpace(2);
    this.page.drawText("No promotion candidates match the current summary.", {
      x: MARGIN_X,
      y: this.y - 10,
      size: SUBTITLE_SIZE,
      font: this.regular,
      color: DOJO_MUTED,
    });
  }
}

export async function buildPromotionCandidatesPdfBytes(
  input: PromotionCandidatesPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new LandscapePdfWriter(pdf, page, regular, bold);

  writer.drawHeader(input);
  writer.drawTableHeader();

  if (input.candidates.length === 0) {
    writer.drawEmptyState();
  } else {
    input.candidates.forEach((candidate, index) => {
      writer.drawCandidateRow(candidate, index);
    });
  }

  return pdf.save();
}
