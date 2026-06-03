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
  status: "booked" | null,
) {
  if (status === "booked") {
    return "Booked";
  }

  return null;
}

export function formatPortalSpacesAvailable(spacesAvailable: number | null) {
  if (spacesAvailable === null) {
    return "Spaces available";
  }

  if (spacesAvailable === 0) {
    return "Full";
  }

  return `${spacesAvailable} space${spacesAvailable === 1 ? "" : "s"} available`;
}

export function formatPortalWaitlistPosition(position: number | null) {
  if (!position) {
    return null;
  }

  return `You are #${position} on the waitlist`;
}

export function formatPortalWaitlistCount(count: number) {
  if (count <= 0) {
    return null;
  }

  return `${count} on waitlist`;
}
