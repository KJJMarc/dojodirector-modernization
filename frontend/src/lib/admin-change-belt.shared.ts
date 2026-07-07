import {
  isAdultBeltCategory,
  isJuniorBeltCategory,
  isJuniorBeltLevel,
  isPlainWhiteBeltLevel,
} from "@/lib/admin-belt-levels.shared";

export interface BeltLevelSelectionRow {
  id: string;
  name: string;
  stripe_count: number | null;
  type?: string | null;
  belt_category?: string | null;
  is_active?: boolean | null;
}

export type AwardBeltLevelValidationFailureCode =
  | "missing_belt"
  | "inactive_belt"
  | "category_mismatch"
  | "invalid_date"
  | "unsupported_rank";

export interface AwardBeltLevelValidationFailure {
  code: AwardBeltLevelValidationFailureCode;
  message: string;
}

export type AwardBeltLevelValidationResult =
  | { ok: true }
  | { ok: false; failure: AwardBeltLevelValidationFailure };

export function isAdultClubBeltLevel(belt: BeltLevelSelectionRow): boolean {
  if (isJuniorBeltCategory(belt.belt_category)) {
    return false;
  }

  if (isAdultBeltCategory(belt.belt_category)) {
    return true;
  }

  return !isJuniorBeltLevel(belt);
}

export function isJuniorClubBeltLevel(belt: BeltLevelSelectionRow): boolean {
  if (isJuniorBeltCategory(belt.belt_category)) {
    return true;
  }

  if (isAdultBeltCategory(belt.belt_category)) {
    return false;
  }

  return isJuniorBeltLevel(belt);
}

export function parseAwardedAtInput(value: string): AwardBeltLevelValidationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      ok: false,
      failure: {
        code: "invalid_date",
        message: "Awarded date must use YYYY-MM-DD format.",
      },
    };
  }

  return { ok: true };
}

export function validateAwardBeltLevelSelection(input: {
  selectedBelt: BeltLevelSelectionRow | null | undefined;
  currentBelt: BeltLevelSelectionRow | null | undefined;
}): AwardBeltLevelValidationResult {
  if (!input.selectedBelt) {
    return {
      ok: false,
      failure: {
        code: "missing_belt",
        message: "Selected belt level was not found for this club.",
      },
    };
  }

  if (input.selectedBelt.is_active === false) {
    return {
      ok: false,
      failure: {
        code: "inactive_belt",
        message:
          "Selected belt level is no longer active for this club. Choose another belt.",
      },
    };
  }

  if (isPlainWhiteBeltLevel(input.selectedBelt)) {
    return {
      ok: false,
      failure: {
        code: "unsupported_rank",
        message:
          "Plain White Belt is not a valid rank. Choose White Belt – 1 Stripe instead.",
      },
    };
  }

  if (!input.currentBelt) {
    return { ok: true };
  }

  const currentIsJunior = isJuniorClubBeltLevel(input.currentBelt);
  const selectedIsJunior = isJuniorClubBeltLevel(input.selectedBelt);

  if (currentIsJunior !== selectedIsJunior) {
    return {
      ok: false,
      failure: {
        code: "category_mismatch",
        message:
          "Selected belt must match the student's current belt category (junior or adult).",
      },
    };
  }

  return { ok: true };
}
