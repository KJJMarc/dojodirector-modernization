import { redirect } from "next/navigation";
import { clubBookingPath, KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

/** Temporary redirect so legacy /book links keep working. */
export default function BookPageRedirect() {
  redirect(clubBookingPath(KINGSTON_CLUB_SLUG));
}
