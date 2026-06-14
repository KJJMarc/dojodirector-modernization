import "server-only";

import {
  classifyLeadAttribution,
  parseLeadAttributionFromFormData,
} from "@/lib/lead-attribution.shared";
import { getProgrammesSchemaAvailable } from "@/lib/admin-programmes.server";
import { STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES } from "@/lib/admin-programmes.shared";
import { BAHAMAS_JIU_JITSU_CLUB_SLUG } from "@/lib/clubs.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { submitLead } from "@/lib/leads.server";
import {
  buildTrialEnquiryProgrammeInterests,
  parseLeadExperienceLevel,
  parseTrialAudience,
  parseTrialEnquiryProgrammeInterest,
  resolveTrialLeadAcademySlugForClub,
  type LeadProgrammeInterest,
  type LeadSubmissionResult,
} from "@/lib/leads.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function loadActiveProgrammeTypesForClub(
  clubId: string,
  clubSlug: string,
): Promise<string[]> {
  if (!(await getProgrammesSchemaAvailable())) {
    if (clubSlug.trim().toLowerCase() === BAHAMAS_JIU_JITSU_CLUB_SLUG) {
      return ["bjj"];
    }

    return [...STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("programme_type, is_active")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load programmes for trial enquiry: ${error.message}`);
  }

  return (data ?? [])
    .filter((row) => row.is_active !== false)
    .map((row) => String(row.programme_type ?? "").trim())
    .filter(Boolean);
}

export async function loadTrialEnquiryProgrammeInterestsForClubSlug(
  clubSlug: string,
): Promise<LeadProgrammeInterest[]> {
  const club = await getClubBySlug(clubSlug);

  if (!club) {
    throw new Error("Academy not found for this enquiry.");
  }

  const programmeTypes = await loadActiveProgrammeTypesForClub(club.id, club.slug);
  return buildTrialEnquiryProgrammeInterests(programmeTypes);
}

export async function processTrialEnquirySubmission(
  clubSlug: string,
  formData: FormData,
): Promise<LeadSubmissionResult> {
  const payload = {
    clubSlug,
    trialAudience: String(formData.get("trialAudience") ?? ""),
    fullName: String(formData.get("fullName") ?? formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    programmeInterest: String(formData.get("programmeInterest") ?? ""),
    experienceLevel: String(formData.get("experienceLevel") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  console.info("[trial-enquiry] submit started", {
    clubSlug: payload.clubSlug,
    trialAudience: payload.trialAudience,
    email: payload.email,
  });

  try {
    const submittingClub = await getClubBySlug(payload.clubSlug);

    if (!submittingClub) {
      throw new Error("Academy not found for this enquiry.");
    }

    const allowedProgrammeInterests = await loadTrialEnquiryProgrammeInterestsForClubSlug(
      submittingClub.slug,
    );
    const trialAudience = parseTrialAudience(payload.trialAudience);
    const targetSlug = resolveTrialLeadAcademySlugForClub(
      payload.clubSlug,
      trialAudience,
    );
    const academy = await getClubBySlug(targetSlug);

    console.info("[trial-enquiry] academy resolved", {
      targetSlug,
      academyId: academy?.id ?? null,
    });

    if (!academy) {
      throw new Error("Academy not found for this enquiry.");
    }

    const attribution = parseLeadAttributionFromFormData(formData);
    const leadSource = classifyLeadAttribution(attribution);

    const result = await submitLead({
      academyId: academy.id,
      trialAudience,
      submission: {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        programmeInterest: parseTrialEnquiryProgrammeInterest(
          payload.programmeInterest,
          allowedProgrammeInterests,
        ),
        experienceLevel: parseLeadExperienceLevel(payload.experienceLevel),
        leadSource,
        notes: payload.notes,
      },
      attribution,
    });

    console.info("[trial-enquiry] submit succeeded", {
      leadId: result.leadId,
      academyId: academy.id,
    });

    return result;
  } catch (error) {
    console.error("[trial-enquiry] submit failed", {
      clubSlug: payload.clubSlug,
      email: payload.email,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error
      ? error
      : new Error("Unable to submit your enquiry.");
  }
}
