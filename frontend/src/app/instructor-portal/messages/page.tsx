import { redirect } from "next/navigation";
import { instructorPortalEntryPath } from "@/lib/instructor-portal-routing.shared";

export const dynamic = "force-dynamic";

export default function LegacyInstructorPortalMessagesRedirect() {
  redirect(instructorPortalEntryPath());
}
