export function normalizeLeadMatchEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";

  return normalized && normalized.includes("@") ? normalized : null;
}

/** Digits-only phone for exact V1 matching (no fuzzy logic). */
export function normalizeLeadMatchPhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

export function buildGuestBookingLeadNote(input: {
  className: string;
  dateLabel: string;
  timeLabel: string;
  bookedAtIso: string;
}) {
  const bookedAtLabel = formatLeadNoteTimestamp(input.bookedAtIso);

  return `[${bookedAtLabel}] Guest booked a trial class: ${input.className.trim()} — ${input.dateLabel.trim()}, ${input.timeLabel.trim()}`;
}

export function appendLeadNote(existingNotes: string | null | undefined, entry: string) {
  const trimmedEntry = entry.trim();
  const trimmedExisting = existingNotes?.trim() ?? "";

  if (!trimmedEntry) {
    return trimmedExisting || null;
  }

  if (!trimmedExisting) {
    return trimmedEntry;
  }

  return `${trimmedExisting}\n\n${trimmedEntry}`;
}

function formatLeadNoteTimestamp(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
