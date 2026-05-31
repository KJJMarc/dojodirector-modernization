import { NextResponse } from "next/server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { createMembershipAgreementPdfSignedUrl } from "@/lib/student-agreement-storage.server";
import { getMembershipAgreementPdfPathForUser } from "@/lib/student-portal-agreements.server";

export const dynamic = "force-dynamic";

interface MembershipAgreementPdfRouteProps {
  params: { userId: string };
}

export async function GET(
  _request: Request,
  { params }: MembershipAgreementPdfRouteProps,
) {
  try {
    await requireAdminAccessForClubSlug(KINGSTON_CLUB_SLUG);

    const pdfPath = await getMembershipAgreementPdfPathForUser(params.userId);

    if (!pdfPath) {
      return NextResponse.json(
        { error: "No stored membership agreement PDF for this student." },
        { status: 404 },
      );
    }

    const signedUrl = await createMembershipAgreementPdfSignedUrl(pdfPath);

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to open agreement PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
