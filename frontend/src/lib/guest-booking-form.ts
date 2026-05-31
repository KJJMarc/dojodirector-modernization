import type { GuestBookingDetails } from "@/lib/guest-booking.shared";
import {
  collectGuestAgreementFieldErrors,
  collectGuestDetailsFieldErrors,
  type GuestAgreementFormValues,
  type GuestBookingFieldErrors,
} from "@/lib/guest-booking-validation.shared";

export type {
  GuestAgreementFormValues,
  GuestBookingFieldErrors,
  GuestBookingValidationField,
} from "@/lib/guest-booking-validation.shared";

export type { GuestBookingDetails };

function readFormField(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value;
  }

  return String(new FormData(form).get(name) ?? "");
}

export function readGuestDetailsFromForm(form: HTMLFormElement): GuestBookingDetails {
  return {
    firstName: readFormField(form, "firstName"),
    lastName: readFormField(form, "lastName"),
    email: readFormField(form, "email"),
    phone: readFormField(form, "phone"),
  };
}

export function validateGuestDetailsFields(
  details: GuestBookingDetails,
): GuestBookingFieldErrors {
  return collectGuestDetailsFieldErrors(details);
}

export function validateGuestAgreementFields(
  agreement: GuestAgreementFormValues,
): GuestBookingFieldErrors {
  return collectGuestAgreementFieldErrors(agreement);
}
