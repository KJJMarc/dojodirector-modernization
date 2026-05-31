import { NextResponse } from "next/server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  GUEST_BOOKINGS_NOT_CONFIGURED_MESSAGE,
  getGuestBookingAgreementPdfPath,
  isGuestBookingsTableAvailable,
} from "@/lib/guest-booking.server";
import { createMembershipAgreementPdfSignedUrl } from "@/lib/student-agreement-storage.server";

export const dynamic = "force-dynamic";

interface GuestBookingAgreementPdfRouteProps {
  params: { clubSlug: string; bookingId: string };
}

export async function GET(
  _request: Request,
  { params }: GuestBookingAgreementPdfRouteProps,
) {
  try {
    const { club } = await requireAdminAccessForClubSlug(params.clubSlug);

    if (!(await isGuestBookingsTableAvailable())) {
      return NextResponse.json(
        { error: GUEST_BOOKINGS_NOT_CONFIGURED_MESSAGE },
        { status: 503 },
      );
    }

    const pdfPath = await getGuestBookingAgreementPdfPath(
      params.bookingId,
      club.id,
    );

    if (!pdfPath) {
      return NextResponse.json(
        { error: "No stored agreement PDF for this guest booking." },
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
