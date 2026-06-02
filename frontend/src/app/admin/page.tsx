import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  resolveAcademyAdminLoginDestination,
} from "@/lib/admin-auth.server";
import { adminLoginPath } from "@/lib/admin-auth.shared";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Admin",
  description: "Dojo Director admin dashboard.",
};

export default async function AdminPage() {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    redirect(adminLoginPath());
  }

  const destination = await resolveAcademyAdminLoginDestination(authUser.id);

  if (destination) {
    redirect(destination);
  }

  redirect(`${adminLoginPath()}?denied=1`);
}
