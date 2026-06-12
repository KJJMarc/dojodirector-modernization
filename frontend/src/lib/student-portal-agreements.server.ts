import "server-only";

import { cache } from "react";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { CLUB_AGREEMENT_TYPE_MEMBER_PORTAL } from "@/lib/club-agreement-templates.shared";
import { resolveMemberPortalAgreementContent } from "@/lib/club-agreement-templates.server";
import { resolveStudentPortalAgreementClubForUser } from "@/lib/student-portal-club.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";
import { buildMembershipAgreementPdfBytes } from "@/lib/membership-agreement-pdf.server";
import {
  AGREEMENT_PDFS_BUCKET,
  getMembershipAgreementPdfStoragePath,
} from "@/lib/student-agreement-storage.shared";
import { uploadMembershipAgreementPdf } from "@/lib/student-agreement-storage.server";
import {
  MEMBERSHIP_AGREEMENT_TYPE,
  MEMBERSHIP_AGREEMENT_VERSION,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
  formatSignatoryTypeLabel,
  isSignatoryType,
  normalizeSignatoryType,
  type SignatoryType,
  type StudentAgreementStatusSummary,
} from "@/lib/student-portal-agreements.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const AGREEMENT_BASE_SELECT =
  "id, agreement_type, version, accepted_at, signed_full_name";
const AGREEMENT_WITH_PDF_SELECT = `${AGREEMENT_BASE_SELECT}, pdf_path`;
const AGREEMENT_SIGNATORY_COLUMNS =
  "signatory_type, participant_name, relationship_to_participant";
const AGREEMENT_FULL_SELECT = `${AGREEMENT_WITH_PDF_SELECT}, ${AGREEMENT_SIGNATORY_COLUMNS}`;

let studentAgreementPdfColumnsAvailable: boolean | null = null;
let studentAgreementSignatoryColumnsAvailable: boolean | null = null;

function shouldLogStudentAgreementGate() {
  return (
    process.env.STUDENT_PORTAL_AGREEMENT_DEBUG === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export function logStudentAgreementGate(
  context: string,
  details: Record<string, unknown>,
) {
  if (!shouldLogStudentAgreementGate()) {
    return;
  }

  console.info("[student-portal-agreement]", context, details);
}

interface StudentAgreementRow {
  id: string;
  agreement_type: string;
  version: string;
  accepted_at: string;
  signed_full_name: string;
  pdf_path?: string | null;
  signatory_type?: string | null;
  participant_name?: string | null;
  relationship_to_participant?: string | null;
}

interface SupabaseErrorLike {
  message?: string;
  code?: string;
}

export interface AdminStudentAgreementSummary {
  agreementLabel: string;
  agreementVersionLabel: string;
  statusLabel: string;
  isComplete: boolean;
  version: string;
  acceptedAt: string | null;
  signedFullName: string | null;
  hasAgreementPdf: boolean;
  signatoryType: SignatoryType | null;
  signatoryTypeLabel: string | null;
  participantName: string | null;
  relationshipToParticipant: string | null;
}

function isMissingOptionalColumnError(
  error: SupabaseErrorLike | null,
  columnNames: string[],
) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist"))
  ) {
    return columnNames.some((name) => message.includes(name.toLowerCase()));
  }

  return false;
}

function isMissingPdfColumnError(error: SupabaseErrorLike | null) {
  return isMissingOptionalColumnError(error, ["pdf_path"]);
}

function isMissingSignatoryColumnError(error: SupabaseErrorLike | null) {
  return isMissingOptionalColumnError(error, [
    "signatory_type",
    "participant_name",
    "relationship_to_participant",
  ]);
}

function canQueryPdfColumns() {
  return studentAgreementPdfColumnsAvailable !== false;
}

function canQuerySignatoryColumns() {
  return studentAgreementSignatoryColumnsAvailable !== false;
}

function markPdfColumnsUnavailable() {
  studentAgreementPdfColumnsAvailable = false;
}

function markPdfColumnsAvailable() {
  studentAgreementPdfColumnsAvailable = true;
}

function markSignatoryColumnsUnavailable() {
  studentAgreementSignatoryColumnsAvailable = false;
}

function markSignatoryColumnsAvailable() {
  studentAgreementSignatoryColumnsAvailable = true;
}

function pickNewestAgreementRow(rows: StudentAgreementRow[] | null) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return rows.reduce((latest, row) =>
    row.accepted_at > latest.accepted_at ? row : latest,
  );
}

async function fetchMembershipAgreementRows(
  userId: string,
  select: string,
  agreementType: string = MEMBERSHIP_AGREEMENT_TYPE,
  version: string = MEMBERSHIP_AGREEMENT_VERSION,
) {
  const supabase = getSupabaseAdminClient();

  return supabase
    .from("student_agreements")
    .select(select)
    .eq("user_id", userId)
    .eq("agreement_type", agreementType)
    .eq("version", version)
    .order("accepted_at", { ascending: false });
}

async function queryMembershipAgreementRow(
  userId: string,
  select: string,
  agreementType: string = MEMBERSHIP_AGREEMENT_TYPE,
  version: string = MEMBERSHIP_AGREEMENT_VERSION,
): Promise<{ row: StudentAgreementRow | null; error: SupabaseErrorLike | null }> {
  const result = await fetchMembershipAgreementRows(
    userId,
    select,
    agreementType,
    version,
  );

  if (!result.error) {
    const rows = Array.isArray(result.data)
      ? (result.data as unknown as StudentAgreementRow[])
      : [];
    return { row: pickNewestAgreementRow(rows), error: null };
  }

  return { row: null, error: result.error };
}

const MEMBERSHIP_AGREEMENT_SELECT_ATTEMPTS = [
  AGREEMENT_FULL_SELECT,
  AGREEMENT_WITH_PDF_SELECT,
  `${AGREEMENT_BASE_SELECT}, ${AGREEMENT_SIGNATORY_COLUMNS}`,
  AGREEMENT_BASE_SELECT,
] as const;

async function loadMembershipAgreementRow(
  userId: string,
  agreementType: string = MEMBERSHIP_AGREEMENT_TYPE,
  version: string = MEMBERSHIP_AGREEMENT_VERSION,
): Promise<StudentAgreementRow | null> {
  const attemptedSelects = new Set<string>();
  let lastError: SupabaseErrorLike | null = null;

  for (const select of MEMBERSHIP_AGREEMENT_SELECT_ATTEMPTS) {
    if (attemptedSelects.has(select)) {
      continue;
    }

    attemptedSelects.add(select);

    const { row, error } = await queryMembershipAgreementRow(
      userId,
      select,
      agreementType,
      version,
    );

    if (!error) {
      if (select.includes("pdf_path")) {
        markPdfColumnsAvailable();
      }
      if (select.includes("signatory_type")) {
        markSignatoryColumnsAvailable();
      }

      return row;
    }

    lastError = error;

    if (isMissingPdfColumnError(error)) {
      markPdfColumnsUnavailable();
      continue;
    }

    if (isMissingSignatoryColumnError(error)) {
      markSignatoryColumnsUnavailable();
      continue;
    }

    break;
  }

  if (lastError) {
    console.error(
      `Failed to load membership agreement for user ${userId}:`,
      lastError.message ?? lastError,
    );
  }

  return null;
}

async function loadStudentAgreementRowForVersion(input: {
  userId: string;
  version: string;
  agreementType?: string;
}): Promise<StudentAgreementRow | null> {
  return loadMembershipAgreementRow(
    input.userId,
    input.agreementType ?? MEMBERSHIP_AGREEMENT_TYPE,
    input.version,
  );
}

async function loadEffectiveStudentAgreementRow(
  userId: string,
): Promise<StudentAgreementRow | null> {
  return loadMembershipAgreementRow(userId);
}

function rowHasStoredPdf(row: StudentAgreementRow | null) {
  if (!row || !canQueryPdfColumns()) {
    return false;
  }

  return Boolean(row.pdf_path?.trim());
}

function mapRowToStatusSummary(row: StudentAgreementRow | null): StudentAgreementStatusSummary {
  const version = row?.version ?? MEMBERSHIP_AGREEMENT_VERSION;
  const signatoryType = normalizeSignatoryType(row?.signatory_type);

  return {
    isComplete: Boolean(row),
    agreementType: MEMBERSHIP_AGREEMENT_TYPE,
    version,
    acceptedAt: row?.accepted_at ?? null,
    signedFullName: row?.signed_full_name ?? null,
    hasAgreementPdf: rowHasStoredPdf(row),
    signatoryType,
    signatoryTypeLabel: formatSignatoryTypeLabel(row?.signatory_type),
    participantName: row?.participant_name?.trim() ?? null,
    relationshipToParticipant: row?.relationship_to_participant?.trim() ?? null,
  };
}

export async function getStudentAgreementStatus(
  userId: string,
): Promise<StudentAgreementStatusSummary> {
  const row = await loadEffectiveStudentAgreementRow(userId);
  return mapRowToStatusSummary(row);
}

export async function getCurrentMemberPortalAgreementRequirement(
  clubId: string = ACTIVE_CLUB_ID,
) {
  const content = await resolveMemberPortalAgreementContent(clubId);

  return {
    agreementType: MEMBERSHIP_AGREEMENT_TYPE,
    templateAgreementType: CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
    version: content.version,
    title: content.title,
    isCustomTemplate: content.isCustomTemplate,
  };
}

interface StudentAgreementGateSnapshot {
  accepted: boolean;
  authUserId: string | null;
  requirement: Awaited<ReturnType<typeof getCurrentMemberPortalAgreementRequirement>>;
  row: Awaited<ReturnType<typeof loadStudentAgreementRowForVersion>>;
}

const loadStudentAgreementGateSnapshot = cache(
  async (userId: string): Promise<StudentAgreementGateSnapshot> => {
    const authUser = await getSupabaseAuthSessionUser();
    const agreementClub = await resolveStudentPortalAgreementClubForUser(userId);

    if (!agreementClub) {
      const requirement = await getCurrentMemberPortalAgreementRequirement();

      return {
        accepted: false,
        authUserId: authUser?.id ?? null,
        requirement,
        row: null,
      };
    }

    const requirement = await getCurrentMemberPortalAgreementRequirement(
      agreementClub.id,
    );
    const row = await loadStudentAgreementRowForVersion({
      userId,
      version: requirement.version,
      agreementType: requirement.agreementType,
    });

    return {
      accepted: Boolean(row),
      authUserId: authUser?.id ?? null,
      requirement,
      row,
    };
  },
);

export async function hasAcceptedCurrentStudentAgreements(
  userId: string,
  options?: { logContext?: string },
) {
  const snapshot = await loadStudentAgreementGateSnapshot(userId);

  logStudentAgreementGate(options?.logContext ?? "hasAcceptedCurrentStudentAgreements", {
    authUserId: snapshot.authUserId,
    studentUserId: userId,
    agreementType: snapshot.requirement.agreementType,
    templateAgreementType: snapshot.requirement.templateAgreementType,
    requiredVersion: snapshot.requirement.version,
    templateTitle: snapshot.requirement.title,
    isCustomTemplate: snapshot.requirement.isCustomTemplate,
    acceptedAgreementRowExists: snapshot.accepted,
    acceptedAgreementRowId: snapshot.row?.id ?? null,
    acceptedAgreementRowVersion: snapshot.row?.version ?? null,
    redirectDecision: snapshot.accepted
      ? "allow_portal"
      : "redirect_to_agreements",
  });

  return snapshot.accepted;
}

async function loadLatestMembershipAgreementRow(
  userId: string,
): Promise<StudentAgreementRow | null> {
  const attemptedSelects = new Set<string>();
  let lastError: SupabaseErrorLike | null = null;

  for (const select of MEMBERSHIP_AGREEMENT_SELECT_ATTEMPTS) {
    if (attemptedSelects.has(select)) {
      continue;
    }

    attemptedSelects.add(select);

    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from("student_agreements")
      .select(select)
      .eq("user_id", userId)
      .eq("agreement_type", MEMBERSHIP_AGREEMENT_TYPE)
      .order("accepted_at", { ascending: false })
      .limit(1);

    if (!result.error) {
      const rows = Array.isArray(result.data)
        ? (result.data as unknown as StudentAgreementRow[])
        : [];

      if (select.includes("pdf_path")) {
        markPdfColumnsAvailable();
      }
      if (select.includes("signatory_type")) {
        markSignatoryColumnsAvailable();
      }

      return rows[0] ?? null;
    }

    lastError = result.error;

    if (isMissingPdfColumnError(result.error)) {
      markPdfColumnsUnavailable();
      continue;
    }

    if (isMissingSignatoryColumnError(result.error)) {
      markSignatoryColumnsUnavailable();
      continue;
    }

    break;
  }

  if (lastError) {
    console.error(
      `Failed to load latest membership agreement for user ${userId}:`,
      lastError.message ?? lastError,
    );
  }

  return null;
}

export async function getAdminStudentAgreementSummary(
  userId: string,
): Promise<AdminStudentAgreementSummary> {
  const row = await loadLatestMembershipAgreementRow(userId);
  const status = mapRowToStatusSummary(row);

  return {
    agreementLabel: `Membership Agreement v${status.version}`,
    agreementVersionLabel: status.version,
    statusLabel: status.isComplete ? "Accepted" : "Not accepted",
    isComplete: status.isComplete,
    version: status.version,
    acceptedAt: status.acceptedAt,
    signedFullName: status.signedFullName,
    hasAgreementPdf: status.hasAgreementPdf,
    signatoryType: status.signatoryType,
    signatoryTypeLabel: status.signatoryTypeLabel,
    participantName: status.participantName,
    relationshipToParticipant: status.relationshipToParticipant,
  };
}

export async function getMembershipAgreementPdfPathForUser(
  userId: string,
): Promise<string | null> {
  if (!canQueryPdfColumns()) {
    return null;
  }

  try {
    const row = await loadEffectiveStudentAgreementRow(userId);
    return row?.pdf_path?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function recordStudentAgreementAcceptance(input: {
  userId: string;
  clubId?: string;
  signedFullName: string;
  signatoryType: SignatoryType;
  participantName?: string | null;
  relationshipToParticipant?: string | null;
  agreementType?: string;
  version?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const signedFullName = input.signedFullName.trim();
  const participantName = input.participantName?.trim() ?? null;
  const relationshipToParticipant = input.relationshipToParticipant?.trim() ?? null;

  if (!signedFullName) {
    throw new Error("Enter the required name to accept the membership agreement.");
  }

  if (input.signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN) {
    if (!participantName) {
      throw new Error("Enter the participant name.");
    }

    if (!relationshipToParticipant) {
      throw new Error("Enter your relationship to the participant.");
    }
  }

  const agreementType = input.agreementType ?? MEMBERSHIP_AGREEMENT_TYPE;
  const agreementClubId =
    input.clubId ??
    (await resolveStudentPortalAgreementClubForUser(input.userId))?.id;

  if (!agreementClubId) {
    throw new Error("Unable to determine which academy membership agreement applies.");
  }

  const agreementContent = await resolveMemberPortalAgreementContent(agreementClubId);
  const version = input.version ?? agreementContent.version;
  const acceptedAt = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const baseRecord: Record<string, unknown> = {
    user_id: input.userId,
    agreement_type: agreementType,
    version,
    accepted_at: acceptedAt,
    signed_full_name: signedFullName,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  };

  if (canQuerySignatoryColumns()) {
    baseRecord.signatory_type = input.signatoryType;
    baseRecord.participant_name =
      input.signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN ? participantName : null;
    baseRecord.relationship_to_participant =
      input.signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN
        ? relationshipToParticipant
        : null;
  }

  let { data: savedRow, error } = await supabase
    .from("student_agreements")
    .upsert(baseRecord, {
      onConflict: "user_id,agreement_type,version",
    })
    .select("id")
    .maybeSingle();

  if (error && isMissingSignatoryColumnError(error)) {
    markSignatoryColumnsUnavailable();

    const legacyRecord = {
      user_id: input.userId,
      agreement_type: agreementType,
      version,
      accepted_at: acceptedAt,
      signed_full_name: signedFullName,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    };

    ({ data: savedRow, error } = await supabase
      .from("student_agreements")
      .upsert(legacyRecord, {
        onConflict: "user_id,agreement_type,version",
      })
      .select("id")
      .maybeSingle());
  } else if (!error) {
    markSignatoryColumnsAvailable();
  }

  if (error) {
    logStudentAgreementGate("recordStudentAgreementAcceptance.saveFailed", {
      authUserId: (await getSupabaseAuthSessionUser())?.id ?? null,
      studentUserId: input.userId,
      agreementType,
      version,
      error: error.message,
    });
    throw new Error(`Failed to save agreement acceptance: ${error.message}`);
  }

  const agreementRecordId = (savedRow as { id: string } | null)?.id;

  logStudentAgreementGate("recordStudentAgreementAcceptance.saved", {
    authUserId: (await getSupabaseAuthSessionUser())?.id ?? null,
    studentUserId: input.userId,
    agreementType,
    version,
    agreementRecordId,
    templateTitle: agreementContent.title,
    isCustomTemplate: agreementContent.isCustomTemplate,
  });

  if (!agreementRecordId) {
    throw new Error("Failed to save agreement acceptance: missing agreement record id.");
  }

  let pdfPath: string | null = null;

  if (canQueryPdfColumns()) {
    try {
      const pdfBytes = await buildMembershipAgreementPdfBytes({
        agreementRecordId,
        signedFullName,
        acceptedAt,
        version,
        documentTitle: agreementContent.pdfDocumentTitle,
        sections: agreementContent.sections,
        signatoryType: input.signatoryType,
        participantName,
        relationshipToParticipant,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      pdfPath = await uploadMembershipAgreementPdf(
        input.userId,
        version,
        pdfBytes,
      );

      const expectedPath = getMembershipAgreementPdfStoragePath(input.userId, version);

      if (pdfPath !== expectedPath) {
        throw new Error("Agreement PDF was stored at an unexpected location.");
      }

      const { error: pdfUpdateError } = await supabase
        .from("student_agreements")
        .update({ pdf_path: pdfPath })
        .eq("id", agreementRecordId);

      if (pdfUpdateError && !isMissingPdfColumnError(pdfUpdateError)) {
        throw new Error(`Failed to link agreement PDF: ${pdfUpdateError.message}`);
      }

      if (!pdfUpdateError) {
        markPdfColumnsAvailable();
      } else {
        markPdfColumnsUnavailable();
        pdfPath = null;
      }
    } catch (pdfError) {
      console.error("Membership agreement PDF generation failed:", pdfError);
      pdfPath = null;
    }
  }

  return {
    agreementType,
    version,
    acceptedAt,
    signedFullName,
    signatoryType: input.signatoryType,
    participantName,
    relationshipToParticipant,
    agreementRecordId,
    pdfPath,
    bucket: AGREEMENT_PDFS_BUCKET,
  };
}
