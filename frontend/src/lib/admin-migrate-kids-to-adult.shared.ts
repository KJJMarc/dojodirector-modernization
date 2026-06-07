export const MIGRATE_TO_ADULT_PROGRAMME_DIALOG_MESSAGE =
  "This will move this student from Kingston Jiu Jitsu Kids to Kingston Jiu Jitsu and give them adult student portal access. Their attendance card, belt history, grading history and profile data will be preserved.";

export const KIDS_ADULT_MIGRATION_GRADE_AWARD_NOTE_PREFIX = "kids_adult_migration";

export interface KidsToAdultMigrationEligibility {
  canMigrate: boolean;
  disabledReason: string | null;
}
