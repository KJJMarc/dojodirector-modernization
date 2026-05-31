export const AGREEMENT_PDFS_BUCKET = "agreement-pdfs";

/** @deprecated Use AGREEMENT_PDFS_BUCKET */
export const STUDENT_AGREEMENTS_BUCKET = AGREEMENT_PDFS_BUCKET;

export function getMembershipAgreementPdfStoragePath(userId: string, version: string) {
  const versionSlug = version.replace(/\./g, "-");
  return `${userId}/membership-agreement-v${versionSlug}.pdf`;
}

export function getGuestBookingAgreementPdfStoragePath(
  bookingId: string,
  version: string,
) {
  const versionSlug = version.replace(/\./g, "-");
  return `guest-bookings/${bookingId}/membership-agreement-v${versionSlug}.pdf`;
}
