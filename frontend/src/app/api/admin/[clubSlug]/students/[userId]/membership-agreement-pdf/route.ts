import { NextResponse } from "next/server";
import { resolveAdminMembershipAgreementPdfSignedUrl } from "@/lib/admin-membership-agreement-pdf.server";

export const dynamic = "force-dynamic";

interface MembershipAgreementPdfRouteProps {
  params: { clubSlug: string; userId: string };
}

export async function GET(
  _request: Request,
  { params }: MembershipAgreementPdfRouteProps,
) {
  try {
    const signedUrl = await resolveAdminMembershipAgreementPdfSignedUrl(
      params.clubSlug,
      params.userId,
    );

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to open agreement PDF.";

    if (message === "Student not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message === "No stored membership agreement PDF for this student.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
