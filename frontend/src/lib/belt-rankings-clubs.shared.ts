import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { KINGSTON_JIU_JITSU_KIDS_CLUB_ID } from "@/lib/clubs.shared";

/** Junior public rankings include active members graded on junior belts from both academies. */
export const JUNIOR_BELT_RANKINGS_SOURCE_CLUB_IDS = [
  ACTIVE_CLUB_ID,
  KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
] as const;
