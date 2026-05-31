/** Member-facing labels for the student portal (not admin wording). */

export function formatPortalBookingStatus(status: string | null) {
  if (!status || status === "booked") {
    return "Booked";
  }

  if (status === "waitlisted") {
    return "Waiting List";
  }

  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

export function formatPortalMemberBookingStatus(
  status: "booked" | "waitlisted" | null,
) {
  if (status === "booked") {
    return "Booked";
  }

  if (status === "waitlisted") {
    return "Waiting List";
  }

  return null;
}

export function formatPortalSpacesAvailable(spacesAvailable: number | null) {
  if (spacesAvailable === null) {
    return "Spaces available";
  }

  if (spacesAvailable === 0) {
    return "Full — join waiting list";
  }

  return `${spacesAvailable} space${spacesAvailable === 1 ? "" : "s"} available`;
}
