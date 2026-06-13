import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  formatAgreementPdfBannerText,
  formatAgreementPdfDocumentTitle,
  shouldSkipAgreementPdfHeaderParagraph,
} from "@/lib/club-agreement-templates.shared";
import {
  MEMBERSHIP_AGREEMENT_SECTIONS,
  MEMBERSHIP_AGREEMENT_VERSION,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  formatSignatoryTypeLabel,
  type MembershipAgreementSection,
  type SignatoryType,
} from "@/lib/student-portal-agreements.shared";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const BODY_SIZE = 10;
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 12;
const HEADING_SIZE = 11;
const LINE_HEIGHT = 14;

export interface MembershipAgreementPdfInput {
  agreementRecordId: string;
  signedFullName: string;
  acceptedAt: string;
  academyName: string;
  version?: string;
  documentTitle?: string;
  sections?: MembershipAgreementSection[];
  signatoryType: SignatoryType;
  participantName?: string | null;
  relationshipToParticipant?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function formatAcceptedAtForPdf(isoTimestamp: string) {
  const date = new Date(isoTimestamp);

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

function formatPdfField(value: string | null | undefined, fallback = "Not recorded") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

class PdfWriter {
  private y = PAGE_HEIGHT - MARGIN_TOP;

  constructor(
    private readonly pdf: PDFDocument,
    private page: PDFPage,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {}

  private addPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  private ensureSpace(lineCount: number) {
    if (this.y - lineCount * LINE_HEIGHT >= MARGIN_BOTTOM) {
      return;
    }

    this.addPage();
  }

  drawLines(
    lines: string[],
    options: { font: PDFFont; size: number; color?: ReturnType<typeof rgb> },
  ) {
    for (const line of lines) {
      this.ensureSpace(1);
      this.page.drawText(line, {
        x: MARGIN_X,
        y: this.y,
        size: options.size,
        font: options.font,
        color: options.color ?? rgb(0, 0, 0),
      });
      this.y -= LINE_HEIGHT;
    }
  }

  drawParagraph(text: string, options?: { bold?: boolean; size?: number }) {
    const font = options?.bold ? this.bold : this.regular;
    const size = options?.size ?? BODY_SIZE;
    const maxWidth = PAGE_WIDTH - MARGIN_X * 2;
    const lines = wrapText(text, maxWidth, font, size);
    this.drawLines(lines, { font, size });
    this.y -= 4;
  }

  drawHeading(text: string) {
    this.y -= 6;
    this.drawParagraph(text, { bold: true, size: HEADING_SIZE });
  }

  gap(amount = 8) {
    this.y -= amount;
  }
}

export async function buildMembershipAgreementPdfBytes(
  input: MembershipAgreementPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new PdfWriter(pdf, page, regular, bold);
  const version = input.version ?? MEMBERSHIP_AGREEMENT_VERSION;
  const sections = input.sections ?? MEMBERSHIP_AGREEMENT_SECTIONS;
  const academyName = input.academyName.trim() || "Kingston Jiu Jitsu";
  const academyBanner = formatAgreementPdfBannerText(academyName);
  const documentTitle =
    input.documentTitle ??
    formatAgreementPdfDocumentTitle(academyName, "Membership Agreement");
  const maxWidth = PAGE_WIDTH - MARGIN_X * 2;

  writer.drawLines(wrapText(academyBanner, maxWidth, bold, TITLE_SIZE), {
    font: bold,
    size: TITLE_SIZE,
  });
  writer.drawLines(wrapText(documentTitle, maxWidth, bold, SUBTITLE_SIZE), {
    font: bold,
    size: SUBTITLE_SIZE,
  });
  writer.drawLines(wrapText(`Version ${version}`, maxWidth, regular, BODY_SIZE), {
    font: regular,
    size: BODY_SIZE,
    color: rgb(0.25, 0.25, 0.25),
  });
  writer.gap(12);

  for (const section of sections) {
    if (section.title) {
      writer.drawHeading(section.title);
    }

    for (const paragraph of section.paragraphs) {
      if (
        !section.title &&
        shouldSkipAgreementPdfHeaderParagraph(paragraph, academyBanner)
      ) {
        continue;
      }

      writer.drawParagraph(paragraph);
    }
  }

  writer.gap(12);
  writer.drawHeading("SIGNATURE RECORD");
  writer.drawParagraph(`Agreement version: ${version}`);
  writer.drawParagraph(`Agreement record ID: ${input.agreementRecordId}`);
  writer.drawParagraph(
    `Signatory type: ${formatSignatoryTypeLabel(input.signatoryType) ?? "Not recorded"}`,
  );
  writer.drawParagraph(`Signed name: ${input.signedFullName}`);
  writer.drawParagraph(`Accepted at: ${formatAcceptedAtForPdf(input.acceptedAt)}`);
  writer.drawParagraph(`IP address: ${formatPdfField(input.ipAddress)}`);
  writer.drawParagraph(`User agent: ${formatPdfField(input.userAgent)}`);

  if (input.signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN) {
    writer.drawParagraph(
      `Participant name: ${formatPdfField(input.participantName)}`,
    );
    writer.drawParagraph(
      `Relationship: ${formatPdfField(input.relationshipToParticipant)}`,
    );
  }

  return pdf.save();
}
