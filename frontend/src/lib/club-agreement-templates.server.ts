import "server-only";

import {
  CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
  CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
  type ClubAgreementType,
  getDefaultGuestTrainingAgreementContent,
  getDefaultMemberPortalAgreementContent,
  resolveAgreementContentFromTemplate,
  serializeAgreementSectionsToBody,
  type ResolvedClubAgreementContent,
} from "@/lib/club-agreement-templates.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseErrorLike = { code?: string; message?: string } | null;

let clubAgreementTemplatesTableAvailable: boolean | null = null;

export const CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE =
  "Training agreement templates are not set up yet. Please run the database migration.";

interface ClubAgreementTemplateRow {
  id: string;
  club_id: string;
  agreement_type: string;
  title: string;
  version: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubAgreementTemplateRecord {
  id: string;
  clubId: string;
  agreementType: ClubAgreementType;
  title: string;
  version: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAgreementAdminCard {
  agreementType: ClubAgreementType;
  title: string;
  activeVersion: string;
  lastUpdated: string | null;
  isCustomTemplate: boolean;
  editHref: string;
}

function isMissingClubAgreementTemplatesTableError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  if (error.code === "42P01") {
    return message.includes("club_agreement_templates");
  }

  if (error.code === "PGRST205" || error.code === "PGRST204") {
    return message.includes("club_agreement_templates");
  }

  return (
    message.includes("club_agreement_templates") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

function mapRow(row: ClubAgreementTemplateRow): ClubAgreementTemplateRecord {
  return {
    id: row.id,
    clubId: row.club_id,
    agreementType: row.agreement_type as ClubAgreementType,
    title: row.title,
    version: row.version,
    body: row.body,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function isClubAgreementTemplatesTableAvailable(): Promise<boolean> {
  if (clubAgreementTemplatesTableAvailable !== null) {
    return clubAgreementTemplatesTableAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("club_agreement_templates")
    .select("id")
    .limit(0);

  if (isMissingClubAgreementTemplatesTableError(error)) {
    clubAgreementTemplatesTableAvailable = false;
    return false;
  }

  clubAgreementTemplatesTableAvailable = !error;
  return clubAgreementTemplatesTableAvailable;
}

async function loadActiveTemplateRow(
  clubId: string,
  agreementType: ClubAgreementType,
): Promise<ClubAgreementTemplateRow | null> {
  const tableAvailable = await isClubAgreementTemplatesTableAvailable();

  if (!tableAvailable) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("club_agreement_templates")
    .select(
      "id, club_id, agreement_type, title, version, body, is_active, created_at, updated_at",
    )
    .eq("club_id", clubId)
    .eq("agreement_type", agreementType)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingClubAgreementTemplatesTableError(error)) {
      clubAgreementTemplatesTableAvailable = false;
      return null;
    }

    throw new Error(`Unable to load agreement template: ${error.message}`);
  }

  return (data as ClubAgreementTemplateRow | null) ?? null;
}

function resolveFromRow(
  row: ClubAgreementTemplateRow | null,
  agreementType: ClubAgreementType,
): ResolvedClubAgreementContent {
  if (!row || !row.is_active) {
    return agreementType === CLUB_AGREEMENT_TYPE_MEMBER_PORTAL
      ? getDefaultMemberPortalAgreementContent()
      : getDefaultGuestTrainingAgreementContent();
  }

  return resolveAgreementContentFromTemplate({
    agreementType,
    title: row.title,
    version: row.version,
    body: row.body,
    updatedAt: row.updated_at,
  });
}

export async function resolveMemberPortalAgreementContent(
  clubId: string,
): Promise<ResolvedClubAgreementContent> {
  const row = await loadActiveTemplateRow(
    clubId,
    CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
  );
  return resolveFromRow(row, CLUB_AGREEMENT_TYPE_MEMBER_PORTAL);
}

export async function resolveGuestTrainingAgreementContent(
  clubId: string,
): Promise<ResolvedClubAgreementContent> {
  const row = await loadActiveTemplateRow(
    clubId,
    CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
  );
  return resolveFromRow(row, CLUB_AGREEMENT_TYPE_GUEST_TRAINING);
}

export async function getActiveMemberPortalAgreementVersion(
  clubId: string,
): Promise<string> {
  const content = await resolveMemberPortalAgreementContent(clubId);
  return content.version;
}

export async function loadTrainingAgreementsAdminOverview(
  clubId: string,
  clubSlug: string,
): Promise<{
  templatesTableAvailable: boolean;
  cards: TrainingAgreementAdminCard[];
}> {
  const templatesTableAvailable =
    await isClubAgreementTemplatesTableAvailable();
  const memberContent = await resolveMemberPortalAgreementContent(clubId);
  const guestContent = await resolveGuestTrainingAgreementContent(clubId);

  const cards: TrainingAgreementAdminCard[] = [
    {
      agreementType: CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
      title: memberContent.title,
      activeVersion: memberContent.version,
      lastUpdated: memberContent.updatedAt,
      isCustomTemplate: memberContent.isCustomTemplate,
      editHref: `/admin/${clubSlug}/training-agreements/${CLUB_AGREEMENT_TYPE_MEMBER_PORTAL}/edit`,
    },
    {
      agreementType: CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
      title: guestContent.title,
      activeVersion: guestContent.version,
      lastUpdated: guestContent.updatedAt,
      isCustomTemplate: guestContent.isCustomTemplate,
      editHref: `/admin/${clubSlug}/training-agreements/${CLUB_AGREEMENT_TYPE_GUEST_TRAINING}/edit`,
    },
  ];

  return { templatesTableAvailable, cards };
}

export interface ClubAgreementTemplateEditState {
  templatesTableAvailable: boolean;
  agreementType: ClubAgreementType;
  templateId: string | null;
  title: string;
  version: string;
  body: string;
  isActive: boolean;
  isCustomTemplate: boolean;
}

export async function loadClubAgreementTemplateForEdit(
  clubId: string,
  agreementType: ClubAgreementType,
): Promise<ClubAgreementTemplateEditState> {
  const templatesTableAvailable =
    await isClubAgreementTemplatesTableAvailable();
  const row = await loadActiveTemplateRow(clubId, agreementType);

  if (row) {
    return {
      templatesTableAvailable,
      agreementType,
      templateId: row.id,
      title: row.title,
      version: row.version,
      body: row.body,
      isActive: row.is_active,
      isCustomTemplate: true,
    };
  }

  const defaults =
    agreementType === CLUB_AGREEMENT_TYPE_MEMBER_PORTAL
      ? getDefaultMemberPortalAgreementContent()
      : getDefaultGuestTrainingAgreementContent();

  return {
    templatesTableAvailable,
    agreementType,
    templateId: null,
    title: defaults.title,
    version: defaults.version,
    body: serializeAgreementSectionsToBody(defaults.sections),
    isActive: true,
    isCustomTemplate: false,
  };
}

export async function saveClubAgreementTemplate(input: {
  clubId: string;
  agreementType: ClubAgreementType;
  templateId: string | null;
  title: string;
  version: string;
  body: string;
  isActive: boolean;
}) {
  const tableAvailable = await isClubAgreementTemplatesTableAvailable();

  if (!tableAvailable) {
    throw new Error(CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE);
  }

  const title = input.title.trim();
  const version = input.version.trim();
  const body = input.body.trim();

  if (!title) {
    throw new Error("Enter an agreement title.");
  }

  if (!version) {
    throw new Error("Enter an agreement version.");
  }

  if (!body) {
    throw new Error("Enter the agreement body text.");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const record = {
    club_id: input.clubId,
    agreement_type: input.agreementType,
    title,
    version,
    body,
    is_active: input.isActive,
    updated_at: now,
  };

  if (input.isActive) {
    let deactivateQuery = supabase
      .from("club_agreement_templates")
      .update({ is_active: false, updated_at: now })
      .eq("club_id", input.clubId)
      .eq("agreement_type", input.agreementType)
      .eq("is_active", true);

    if (input.templateId) {
      deactivateQuery = deactivateQuery.neq("id", input.templateId);
    }

    const { error: deactivateError } = await deactivateQuery;

    if (deactivateError) {
      throw new Error(
        `Unable to update agreement template: ${deactivateError.message}`,
      );
    }
  }

  if (input.templateId) {
    const { error } = await supabase
      .from("club_agreement_templates")
      .update(record)
      .eq("id", input.templateId)
      .eq("club_id", input.clubId);

    if (error) {
      throw new Error(`Unable to save agreement template: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase.from("club_agreement_templates").insert({
    ...record,
    created_at: now,
  });

  if (error) {
    throw new Error(`Unable to save agreement template: ${error.message}`);
  }
}
