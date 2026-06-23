import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { KidsPromotionRegisterSession } from "@/lib/admin-kids-promotion-registers.shared";
import { KIDS_PROMOTION_REGISTER_PDF_TITLE } from "@/lib/admin-kids-promotion-registers.shared";
import { formatAdminAttendanceStatusLabel } from "@/lib/admin-session-bookings.shared";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const BODY_SIZE = 9;
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 11;
const META_SIZE = 9;
const ROW_HEIGHT = 16;
const HEADER_BAND_HEIGHT = 88;

const DOJO_RED = rgb(0.72, 0.11, 0.11);
const DOJO_DARK = rgb(0.08, 0.08, 0.08);
const DOJO_MUTED = rgb(0.35, 0.35, 0.35);
const TABLE_HEADER_BG = rgb(0.92, 0.92, 0.92);
const TABLE_ROW_ALT = rgb(0.97, 0.97, 0.97);
const CANDIDATE_ROW_BG = rgb(1, 0.96, 0.86);
const TABLE_BORDER = rgb(0.82, 0.82, 0.82);

const TABLE_COLUMNS = [
  { label: "Student", width: 145 },
  { label: "Attendance", width: 72 },
  { label: "Current belt", width: 108 },
  { label: "Suggested next", width: 108 },
  { label: "Candidate", width: 62 },
] as const;

export interface KidsPromotionRegisterSessionPdfInput {
  academyName: string;
  generatedAt: string;
  candidatesOnly: boolean;
  session: KidsPromotionRegisterSession;
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

function slugifyFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildKidsPromotionRegisterSessionPdfFilename(input: {
  clubSlug: string;
  session: KidsPromotionRegisterSession;
  candidatesOnly: boolean;
}) {
  const classPart = slugifyFilenamePart(input.session.className) || "class";
  const datePart = slugifyFilenamePart(input.session.dateLabel) || "session";
  const suffix = input.candidatesOnly ? "-candidates" : "";

  return `kjj-kids-register-${classPart}-${datePart}${suffix}.pdf`;
}

class RegisterPdfWriter {
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

  drawHeader(input: KidsPromotionRegisterSessionPdfInput) {
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
      width: PAGE_WIDTH,
      height: HEADER_BAND_HEIGHT,
      color: rgb(1, 1, 1),
    });

    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_BAND_HEIGHT,
      width: 6,
      height: HEADER_BAND_HEIGHT,
      color: DOJO_RED,
    });

    this.page.drawText(input.academyName, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 28,
      size: TITLE_SIZE,
      font: this.bold,
      color: DOJO_DARK,
    });

    this.page.drawText(KIDS_PROMOTION_REGISTER_PDF_TITLE, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 46,
      size: SUBTITLE_SIZE,
      font: this.bold,
      color: DOJO_DARK,
    });

    const classLabel = input.session.className;
    this.page.drawText(classLabel, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 62,
      size: META_SIZE,
      font: this.bold,
      color: DOJO_DARK,
    });

    const sessionMeta = [
      `${input.session.dayLabel}, ${input.session.dateLabel}`,
      input.session.timeLabel,
      input.session.location,
      input.candidatesOnly ? "Candidates only" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    this.page.drawText(sessionMeta, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 76,
      size: META_SIZE,
      font: this.regular,
      color: DOJO_MUTED,
    });

    const generatedLabel = `Generated: ${formatGeneratedDateForPdf(input.generatedAt)}`;
    this.page.drawText(generatedLabel, {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        this.regular.widthOfTextAtSize(generatedLabel, META_SIZE),
      y: PAGE_HEIGHT - 76,
      size: META_SIZE,
      font: this.regular,
      color: DOJO_MUTED,
    });

    this.y = PAGE_HEIGHT - HEADER_BAND_HEIGHT - 20;
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
        y: headerY - 10,
        size: BODY_SIZE,
        font: this.bold,
        color: DOJO_DARK,
      });
    });

    this.y -= ROW_HEIGHT + 2;
  }

  drawAttendeeRow(
    attendee: KidsPromotionRegisterSession["attendees"][number],
    rowIndex: number,
  ) {
    this.ensureSpace(2);
    const columnX = getColumnXPositions();
    const rowY = this.y;
    const isCandidate = attendee.isPromotionCandidate;
    const rowBackground = isCandidate
      ? CANDIDATE_ROW_BG
      : rowIndex % 2 === 0
        ? rgb(1, 1, 1)
        : TABLE_ROW_ALT;

    this.page.drawRectangle({
      x: MARGIN_X,
      y: rowY - ROW_HEIGHT + 4,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: ROW_HEIGHT,
      color: rowBackground,
      borderColor: isCandidate ? rgb(0.85, 0.7, 0.35) : TABLE_BORDER,
      borderWidth: isCandidate ? 0.75 : 0.25,
    });

    const currentBelt =
      attendee.promotionCandidate?.assessment.currentBeltLabel ?? "—";
    const nextBelt = attendee.promotionCandidate?.assessment.nextBeltLabel ?? "—";
    const cells = [
      attendee.fullName,
      formatAdminAttendanceStatusLabel(attendee.attendanceStatus),
      currentBelt,
      nextBelt,
      isCandidate ? "Yes" : "—",
    ];

    cells.forEach((value, index) => {
      const column = TABLE_COLUMNS[index];
      const text = truncateText(value, column.width - 8, this.regular, BODY_SIZE);

      this.page.drawText(text, {
        x: columnX[index] + 4,
        y: rowY - 10,
        size: BODY_SIZE,
        font: isCandidate && index === 4 ? this.bold : this.regular,
        color: DOJO_DARK,
      });
    });

    this.y -= ROW_HEIGHT;
  }

  drawEmptyState(candidatesOnly: boolean) {
    this.ensureSpace(2);
    const message = candidatesOnly
      ? "No promotion candidates are booked for this class."
      : "No students are booked for this class yet.";

    this.page.drawText(message, {
      x: MARGIN_X,
      y: this.y - 10,
      size: SUBTITLE_SIZE,
      font: this.regular,
      color: DOJO_MUTED,
    });
  }
}

export async function buildKidsPromotionRegisterSessionPdfBytes(
  input: KidsPromotionRegisterSessionPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new RegisterPdfWriter(pdf, page, regular, bold);

  writer.drawHeader(input);
  writer.drawTableHeader();

  if (input.session.attendees.length === 0) {
    writer.drawEmptyState(input.candidatesOnly);
  } else {
    input.session.attendees.forEach((attendee, index) => {
      writer.drawAttendeeRow(attendee, index);
    });
  }

  return pdf.save();
}
