import { NextResponse } from "next/server";
import { processTrialEnquirySubmission } from "@/lib/trial-enquiry.server";

export const dynamic = "force-dynamic";

interface TrialEnquiryRouteContext {
  params: { clubSlug: string };
}

export async function POST(
  request: Request,
  { params }: TrialEnquiryRouteContext,
) {
  try {
    const formData = await request.formData();
    const result = await processTrialEnquirySubmission(params.clubSlug, formData);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit your enquiry.";

    console.error("[trial-enquiry] api failed", {
      clubSlug: params.clubSlug,
      message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
