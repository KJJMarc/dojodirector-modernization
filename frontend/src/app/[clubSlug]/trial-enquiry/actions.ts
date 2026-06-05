"use server";

import { requireClubBySlug } from "@/lib/clubs.server";
import { submitLead } from "@/lib/leads.server";
import {
  parseLeadExperienceLevel,
  parseLeadProgrammeInterest,
  parseTrialAudience,
  resolveTrialLeadAcademySlug,
  type LeadSubmissionResult,
} from "@/lib/leads.shared";

export type { LeadSubmissionResult };

export async function submitTrialEnquiryAction(
  _clubSlug: string,
  formData: FormData,
): Promise<LeadSubmissionResult> {
  const trialAudience = parseTrialAudience(String(formData.get("trialAudience") ?? ""));
  const targetSlug = resolveTrialLeadAcademySlug(trialAudience);
  const academy = await requireClubBySlug(targetSlug);

  return submitLead({
    academyId: academy.id,
    trialAudience,
    submission: {
      fullName: String(formData.get("fullName") ?? formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      programmeInterest: parseLeadProgrammeInterest(
        String(formData.get("programmeInterest") ?? ""),
      ),
      experienceLevel: parseLeadExperienceLevel(
        String(formData.get("experienceLevel") ?? ""),
      ),
      leadSource: "website",
      notes: String(formData.get("notes") ?? ""),
    },
  });
}
