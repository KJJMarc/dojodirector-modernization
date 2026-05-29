export interface StudentBookingDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export function normalizeStudentBookingDetails(
  firstName: string,
  lastName: string,
  email: string,
): StudentBookingDetails {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
  };
}

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

export function readStudentDetailsFromForm(
  form: HTMLFormElement,
): StudentBookingDetails {
  return normalizeStudentBookingDetails(
    readFormField(form, "firstName"),
    readFormField(form, "lastName"),
    readFormField(form, "email"),
  );
}

export function validateStudentBookingDetailsClient(
  details: StudentBookingDetails,
): string | null {
  if (!details.firstName && !details.lastName) {
    return "Please enter your first and last name.";
  }

  if (!details.firstName) {
    return "Please enter your first name.";
  }

  if (!details.lastName) {
    return "Please enter your last name.";
  }

  if (!details.email || !details.email.includes("@")) {
    return "Please enter a valid email address.";
  }

  return null;
}
