import "server-only";

import { getClubBySlug } from "@/lib/clubs.server";
import { submitLead } from "@/lib/leads.server";
import {
  parseLeadExperienceLevel,
  parseLeadProgrammeInterest,
  parseTrialAudience,
  resolveTrialLeadAcademySlugForClub,
  type LeadSubmissionResult,
} from "@/lib/leads.shared";

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

    const result = await submitLead({
      academyId: academy.id,
      trialAudience,
      submission: {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        programmeInterest: parseLeadProgrammeInterest(payload.programmeInterest),
        experienceLevel: parseLeadExperienceLevel(payload.experienceLevel),
        leadSource: "website",
        notes: payload.notes,
      },
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
