import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  clubAdminPath,
} from "@/lib/clubs.shared";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "trial_booked",
  "trial_attended",
  "joined",
  "closed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "website",
  "phone",
  "walk_in",
  "facebook",
  "google",
  "referral",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_PROGRAMME_INTERESTS = [
  "bjj",
  "kids",
  "muay_thai",
  "strength_conditioning",
  "not_sure",
] as const;

export type LeadProgrammeInterest = (typeof LEAD_PROGRAMME_INTERESTS)[number];

/** Programme options shown on public trial enquiry forms (audience is captured separately). */
export const TRIAL_ENQUIRY_PROGRAMME_INTERESTS = [
  "bjj",
  "muay_thai",
  "strength_conditioning",
  "not_sure",
] as const satisfies readonly LeadProgrammeInterest[];

export const LEAD_EXPERIENCE_LEVELS = [
  "complete_beginner",
  "some_experience",
  "returning",
  "not_sure",
] as const;

export type LeadExperienceLevel = (typeof LEAD_EXPERIENCE_LEVELS)[number];

export const TRIAL_AUDIENCES = ["adult", "child_teen"] as const;

export type TrialAudience = (typeof TRIAL_AUDIENCES)[number];

export interface LeadSubmission {
  fullName: string;
  email: string;
  phone: string;
  programmeInterest: LeadProgrammeInterest;
  experienceLevel: LeadExperienceLevel;
  leadSource: LeadSource;
  notes: string;
}

export interface LeadSubmissionResult {
  ok: true;
  leadId: string;
  message: string;
}

export type LeadFollowUpStatus = "needs_follow_up" | "ok";

export interface AdminArchivedLeadListRow {
  id: string;
  fullName: string;
  status: LeadStatus;
  programmeInterest: LeadProgrammeInterest;
  archivedAt: string;
}

export interface AdminLeadListRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  programmeInterest: LeadProgrammeInterest;
  experienceLevel: LeadExperienceLevel;
  leadSource: LeadSource;
  status: LeadStatus;
  createdAt: string;
  submittedAt: string;
  contactedAt: string | null;
  trialBookedAt: string | null;
  trialAttendedAt: string | null;
  joinedAt: string | null;
  lastActivityAt: string;
  linkedTrialSessionStartsAt: string | null;
  followUpStatus: LeadFollowUpStatus;
}

export interface AdminLeadDetail {
  id: string;
  academyId: string;
  fullName: string;
  email: string;
  phone: string | null;
  programmeInterest: LeadProgrammeInterest;
  experienceLevel: LeadExperienceLevel;
  leadSource: LeadSource;
  notes: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  contactedAt: string | null;
  trialBookedAt: string | null;
  trialAttendedAt: string | null;
  joinedAt: string | null;
  lastActivityAt: string;
}

export interface AdminLeadsSummary {
  newLeads: number;
  needsFollowUp: number;
  trialBooked: number;
  joinedThisMonth: number;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LEADS_NOT_CONFIGURED_MESSAGE =
  "Leads are not set up yet. Please run the database migration.";

/** Resolve target academy slug for a Kingston-area trial enquiry by audience. */
export function resolveTrialLeadAcademySlug(audience: TrialAudience): string {
  if (audience === "child_teen") {
    return KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG;
  }

  return KINGSTON_CLUB_SLUG;
}

/** Resolve which academy receives a trial enquiry from a club-scoped public form. */
export function resolveTrialLeadAcademySlugForClub(
  clubSlug: string,
  audience: TrialAudience,
): string {
  const normalizedClubSlug = clubSlug.trim().toLowerCase();

  if (normalizedClubSlug === BAHAMAS_JIU_JITSU_CLUB_SLUG) {
    return BAHAMAS_JIU_JITSU_CLUB_SLUG;
  }

  return resolveTrialLeadAcademySlug(audience);
}

/** Manage Leads hub for the academy. */
export function clubLeadsAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads");
}

export function clubLeadsListAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads/list");
}

export function clubLeadsArchivedAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads/archived");
}

export function clubLeadNewAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads/new");
}

export function clubLeadEmailSettingsAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads/email-settings");
}

export function clubLeadDetailAdminPath(clubSlug: string, leadId: string) {
  return clubAdminPath(clubSlug, `leads/${leadId}`);
}

export function formatLeadStatusLabel(status: LeadStatus | string) {
  switch (status) {
    case "new":
      return "New";
    case "contacted":
      return "Contacted";
    case "trial_booked":
      return "Trial Booked";
    case "trial_attended":
      return "Trial Attended";
    case "joined":
      return "Joined";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function formatLeadSourceLabel(value: LeadSource | string) {
  switch (value) {
    case "website":
      return "Website";
    case "phone":
      return "Phone";
    case "walk_in":
      return "Walk In";
    case "facebook":
      return "Facebook";
    case "google":
      return "Google";
    case "referral":
      return "Referral";
    case "other":
      return "Other";
    default:
      return value;
  }
}

export function formatTrialAudienceLabel(value: TrialAudience | string) {
  switch (value) {
    case "adult":
      return "Adult";
    case "child_teen":
      return "Child / Teen";
    default:
      return value;
  }
}

export function formatLeadProgrammeInterestLabel(value: LeadProgrammeInterest | string) {
  switch (value) {
    case "bjj":
      return "Brazilian Jiu Jitsu";
    case "kids":
      return "Kids / Juniors";
    case "muay_thai":
      return "Muay Thai";
    case "strength_conditioning":
      return "Strength & Conditioning";
    case "not_sure":
      return "Not sure";
    default:
      return value;
  }
}

export function formatLeadExperienceLevelLabel(value: LeadExperienceLevel | string) {
  switch (value) {
    case "complete_beginner":
      return "Complete beginner";
    case "some_experience":
      return "Some experience";
    case "returning":
      return "Returning student";
    case "not_sure":
      return "Not sure";
    default:
      return value;
  }
}

export function formatAdminLeadDateTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAdminLeadDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(date);
}

export function formatLeadFollowUpStatusLabel(status: LeadFollowUpStatus) {
  return status === "needs_follow_up" ? "Needs Follow Up" : "OK / Progressing";
}

export function computeLeadFollowUpStatus(input: {
  status: LeadStatus;
  submittedAt: string;
  contactedAt: string | null;
  trialAttendedAt: string | null;
  linkedTrialSessionStartsAt: string | null;
  now?: Date;
}): LeadFollowUpStatus {
  const now = input.now ?? new Date();

  if (input.status === "new") {
    const submitted = new Date(input.submittedAt);

    if (!Number.isNaN(submitted.getTime()) && now.getTime() - submitted.getTime() > TWO_DAYS_MS) {
      return "needs_follow_up";
    }
  }

  if (input.status === "contacted") {
    const contacted = input.contactedAt ? new Date(input.contactedAt) : null;

    if (
      contacted &&
      !Number.isNaN(contacted.getTime()) &&
      now.getTime() - contacted.getTime() > SEVEN_DAYS_MS
    ) {
      return "needs_follow_up";
    }
  }

  if (input.status === "trial_booked" && !input.trialAttendedAt) {
    const sessionStart = input.linkedTrialSessionStartsAt
      ? new Date(input.linkedTrialSessionStartsAt)
      : null;

    if (
      sessionStart &&
      !Number.isNaN(sessionStart.getTime()) &&
      now.getTime() > sessionStart.getTime()
    ) {
      return "needs_follow_up";
    }
  }

  return "ok";
}

export function buildAdminLeadsSummary(leads: AdminLeadListRow[]): AdminLeadsSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    newLeads: leads.filter((lead) => lead.status === "new").length,
    needsFollowUp: leads.filter((lead) => lead.followUpStatus === "needs_follow_up").length,
    trialBooked: leads.filter((lead) => lead.status === "trial_booked").length,
    joinedThisMonth: leads.filter((lead) => {
      if (lead.status !== "joined" || !lead.joinedAt) {
        return false;
      }

      const joinedAt = new Date(lead.joinedAt);

      return !Number.isNaN(joinedAt.getTime()) && joinedAt >= monthStart;
    }).length,
  };
}

export function parseTrialAudience(value: string): TrialAudience {
  if (!TRIAL_AUDIENCES.includes(value as TrialAudience)) {
    throw new Error("Select who the trial is for.");
  }

  return value as TrialAudience;
}

export function parseLeadSource(value: string): LeadSource {
  if (!LEAD_SOURCES.includes(value as LeadSource)) {
    throw new Error("Select a lead source.");
  }

  return value as LeadSource;
}

export function parseLeadProgrammeInterest(value: string): LeadProgrammeInterest {
  if (!LEAD_PROGRAMME_INTERESTS.includes(value as LeadProgrammeInterest)) {
    throw new Error("Select a programme interest.");
  }

  return value as LeadProgrammeInterest;
}

export function parseLeadExperienceLevel(value: string): LeadExperienceLevel {
  if (!LEAD_EXPERIENCE_LEVELS.includes(value as LeadExperienceLevel)) {
    throw new Error("Select an experience level.");
  }

  return value as LeadExperienceLevel;
}

export function parseLeadStatus(value: string): LeadStatus {
  if (!LEAD_STATUSES.includes(value as LeadStatus)) {
    throw new Error("Select a valid status.");
  }

  return value as LeadStatus;
}

export function parseLeadSubmission(input: LeadSubmission): LeadSubmission {
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error("Name is required.");
  }

  const email = input.email.trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  const phone = input.phone.trim();
  const notes = input.notes.trim();

  return {
    fullName,
    email,
    phone,
    programmeInterest: parseLeadProgrammeInterest(input.programmeInterest),
    experienceLevel: parseLeadExperienceLevel(input.experienceLevel),
    leadSource: parseLeadSource(input.leadSource),
    notes,
  };
}
