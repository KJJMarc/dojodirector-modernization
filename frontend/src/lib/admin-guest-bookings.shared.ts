export function formatAdminGuestBookingDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

export function guestBookingAgreementPdfHref(clubSlug: string, bookingId: string) {
  return `/api/admin/${clubSlug}/guest-bookings/${bookingId}/agreement-pdf`;
}
