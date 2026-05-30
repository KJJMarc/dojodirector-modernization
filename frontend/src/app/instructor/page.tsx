import { redirect } from "next/navigation";
import { getDefaultInstructorPortalPath } from "@/lib/instructor-portal.server";

export const dynamic = "force-dynamic";

export default async function InstructorIndexPage() {
  redirect(await getDefaultInstructorPortalPath());
}
