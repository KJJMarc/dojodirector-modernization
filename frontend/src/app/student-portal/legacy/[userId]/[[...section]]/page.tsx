import { notFound, redirect } from "next/navigation";
import { resolveLegacyStudentPortalRedirectPath } from "@/lib/student-portal-club.server";
import { isStudentPortalUserIdParam } from "@/lib/student-portal-routing.shared";

export const dynamic = "force-dynamic";

interface LegacyStudentPortalRedirectPageProps {
  params: { userId: string; section?: string[] };
}

export default async function LegacyStudentPortalRedirectPage({
  params,
}: LegacyStudentPortalRedirectPageProps) {
  if (!isStudentPortalUserIdParam(params.userId)) {
    notFound();
  }

  const targetBase = await resolveLegacyStudentPortalRedirectPath(params.userId);
  const sectionPath = params.section?.filter(Boolean).join("/") ?? "";

  redirect(sectionPath ? `${targetBase}/${sectionPath}` : targetBase);
}
