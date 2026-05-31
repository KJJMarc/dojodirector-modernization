import { redirect } from "next/navigation";
import { resolveInstructorPortalSessionState } from "@/lib/instructor-portal-auth.server";

export const dynamic = "force-dynamic";

export default async function InstructorPortalAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveInstructorPortalSessionState();

  if (session.status === "signed_out") {
    redirect("/instructor-portal/login");
  }

  return children;
}
