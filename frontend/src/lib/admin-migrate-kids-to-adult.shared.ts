export const MIGRATE_TO_ADULT_PROGRAMME_DIALOG_MESSAGE =
  "This will move this student from Kingston Jiu Jitsu Kids to Kingston Jiu Jitsu and give them adult student portal access. Their attendance card, belt history, grading history and profile data will be preserved.";

export interface KidsToAdultMigrationEligibility {
  canMigrate: boolean;
  disabledReason: string | null;
}
