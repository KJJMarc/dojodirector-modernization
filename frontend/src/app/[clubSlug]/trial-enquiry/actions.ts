"use server";

import { processTrialEnquirySubmission } from "@/lib/trial-enquiry.server";
import type { LeadSubmissionResult } from "@/lib/leads.shared";

export async function submitTrialEnquiryAction(
  clubSlug: string,
  formData: FormData,
): Promise<LeadSubmissionResult> {
  return processTrialEnquirySubmission(clubSlug, formData);
}
