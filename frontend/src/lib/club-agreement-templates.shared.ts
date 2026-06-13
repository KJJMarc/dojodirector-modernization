import {
  GUEST_TRAINING_AGREEMENT_SECTIONS,
  GUEST_TRAINING_AGREEMENT_VERSION,
} from "@/lib/guest-training-agreement.shared";
import {
  MEMBERSHIP_AGREEMENT_SECTIONS,
  MEMBERSHIP_AGREEMENT_VERSION,
  type MembershipAgreementSection,
} from "@/lib/student-portal-agreements.shared";

export const CLUB_AGREEMENT_TYPE_MEMBER_PORTAL = "member_portal_agreement" as const;
export const CLUB_AGREEMENT_TYPE_GUEST_TRAINING = "guest_training_agreement" as const;

export type ClubAgreementType =
  | typeof CLUB_AGREEMENT_TYPE_MEMBER_PORTAL
  | typeof CLUB_AGREEMENT_TYPE_GUEST_TRAINING;

export const CLUB_AGREEMENT_TYPES = [
  CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
  CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
] as const;

export const DEFAULT_MEMBER_PORTAL_AGREEMENT_TITLE = "Membership Agreement";
export const DEFAULT_GUEST_TRAINING_AGREEMENT_TITLE = "Training Agreement";

const SECTION_SEPARATOR = "\n\n---\n\n";
const SECTION_TITLE_PREFIX = "## ";

export interface ResolvedClubAgreementContent {
  agreementType: ClubAgreementType;
  title: string;
  version: string;
  sections: MembershipAgreementSection[];
  displayLabel: string;
  pdfDocumentTitle: string;
  isCustomTemplate: boolean;
  updatedAt: string | null;
}

/** Serializable agreement content for client components. */
export interface ClientClubAgreementContent {
  title: string;
  version: string;
  sections: MembershipAgreementSection[];
  displayLabel: string;
}

export function toClientClubAgreementContent(
  content: ResolvedClubAgreementContent,
): ClientClubAgreementContent {
  return {
    title: content.title,
    version: content.version,
    sections: content.sections,
    displayLabel: content.displayLabel,
  };
}

export function isClubAgreementType(value: string): value is ClubAgreementType {
  return (CLUB_AGREEMENT_TYPES as readonly string[]).includes(value);
}

export function clubAgreementTypeLabel(agreementType: ClubAgreementType) {
  if (agreementType === CLUB_AGREEMENT_TYPE_MEMBER_PORTAL) {
    return "Member Portal Agreement";
  }

  return "Guest Training Agreement";
}

export function trainingAgreementEditPageTitle(agreementType: ClubAgreementType) {
  return `Edit ${clubAgreementTypeLabel(agreementType)}`;
}

export function clubAgreementEditPath(clubSlug: string, agreementType: ClubAgreementType) {
  return `/admin/${clubSlug}/training-agreements/${agreementType}/edit`;
}

export function formatClubAgreementDisplayLabel(title: string, version: string) {
  return `${title} v${version}`;
}

const DEFAULT_AGREEMENT_CLUB_NAME = "Kingston Jiu Jitsu";

/** Uppercase banner shown at the top of generated agreement PDFs. */
export function formatAgreementPdfBannerText(clubName: string): string {
  return clubName.trim().toUpperCase();
}

/** Build the subtitle/title line shown under the PDF banner. */
export function formatAgreementPdfDocumentTitle(
  clubName: string,
  agreementTitle: string,
): string {
  const normalizedClubName = clubName.trim();
  const normalizedTitle = agreementTitle.trim();

  if (!normalizedClubName) {
    return normalizedTitle;
  }

  if (normalizedTitle.toLowerCase().startsWith(normalizedClubName.toLowerCase())) {
    return normalizedTitle;
  }

  return `${normalizedClubName} ${normalizedTitle}`;
}

export function shouldSkipAgreementPdfHeaderParagraph(
  paragraph: string,
  academyBanner: string,
): boolean {
  const normalizedParagraph = paragraph.trim();

  if (!normalizedParagraph) {
    return false;
  }

  if (
    normalizedParagraph === academyBanner ||
    normalizedParagraph === formatAgreementPdfBannerText(DEFAULT_AGREEMENT_CLUB_NAME)
  ) {
    return true;
  }

  return (
    normalizedParagraph === "MEMBERSHIP AGREEMENT" ||
    normalizedParagraph === "TRAINING AGREEMENT" ||
    normalizedParagraph.startsWith("Version ")
  );
}

export function serializeAgreementSectionsToBody(
  sections: MembershipAgreementSection[],
): string {
  return sections
    .map((section) => {
      const paragraphs = section.paragraphs.join("\n\n");
      return section.title
        ? `${SECTION_TITLE_PREFIX}${section.title}\n\n${paragraphs}`
        : paragraphs;
    })
    .join(SECTION_SEPARATOR);
}

export function parseAgreementBodyToSections(body: string): MembershipAgreementSection[] {
  const trimmed = body.trim();

  if (!trimmed) {
    return [];
  }

  return trimmed.split(SECTION_SEPARATOR).map((chunk) => {
    const sectionText = chunk.trim();
    const lines = sectionText.split("\n");
    const firstLine = lines[0]?.trim() ?? "";

    if (firstLine.startsWith(SECTION_TITLE_PREFIX)) {
      const title = firstLine.slice(SECTION_TITLE_PREFIX.length).trim();
      const paragraphs = sectionText
        .slice(firstLine.length)
        .trim()
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      return { title, paragraphs };
    }

    const paragraphs = sectionText
      .split(/\n\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return { paragraphs };
  });
}

export function getDefaultMemberPortalAgreementContent(
  clubName: string = DEFAULT_AGREEMENT_CLUB_NAME,
): ResolvedClubAgreementContent {
  return {
    agreementType: CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
    title: DEFAULT_MEMBER_PORTAL_AGREEMENT_TITLE,
    version: MEMBERSHIP_AGREEMENT_VERSION,
    sections: MEMBERSHIP_AGREEMENT_SECTIONS,
    displayLabel: formatClubAgreementDisplayLabel(
      DEFAULT_MEMBER_PORTAL_AGREEMENT_TITLE,
      MEMBERSHIP_AGREEMENT_VERSION,
    ),
    pdfDocumentTitle: formatAgreementPdfDocumentTitle(
      clubName,
      DEFAULT_MEMBER_PORTAL_AGREEMENT_TITLE,
    ),
    isCustomTemplate: false,
    updatedAt: null,
  };
}

export function getDefaultGuestTrainingAgreementContent(
  clubName: string = DEFAULT_AGREEMENT_CLUB_NAME,
): ResolvedClubAgreementContent {
  return {
    agreementType: CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
    title: DEFAULT_GUEST_TRAINING_AGREEMENT_TITLE,
    version: GUEST_TRAINING_AGREEMENT_VERSION,
    sections: GUEST_TRAINING_AGREEMENT_SECTIONS,
    displayLabel: formatClubAgreementDisplayLabel(
      DEFAULT_GUEST_TRAINING_AGREEMENT_TITLE,
      GUEST_TRAINING_AGREEMENT_VERSION,
    ),
    pdfDocumentTitle: formatAgreementPdfDocumentTitle(
      clubName,
      DEFAULT_GUEST_TRAINING_AGREEMENT_TITLE,
    ),
    isCustomTemplate: false,
    updatedAt: null,
  };
}

export function resolveAgreementContentFromTemplate(input: {
  clubName: string;
  agreementType: ClubAgreementType;
  title: string;
  version: string;
  body: string;
  updatedAt: string;
}): ResolvedClubAgreementContent {
  const parsedSections = parseAgreementBodyToSections(input.body);
  const fallback =
    input.agreementType === CLUB_AGREEMENT_TYPE_MEMBER_PORTAL
      ? getDefaultMemberPortalAgreementContent(input.clubName)
      : getDefaultGuestTrainingAgreementContent(input.clubName);
  const sections =
    parsedSections.length > 0 ? parsedSections : fallback.sections;
  const pdfDocumentTitle = formatAgreementPdfDocumentTitle(
    input.clubName,
    input.title,
  );

  return {
    agreementType: input.agreementType,
    title: input.title,
    version: input.version,
    sections,
    displayLabel: formatClubAgreementDisplayLabel(input.title, input.version),
    pdfDocumentTitle,
    isCustomTemplate: true,
    updatedAt: input.updatedAt,
  };
}
