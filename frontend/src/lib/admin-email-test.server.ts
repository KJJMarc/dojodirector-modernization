import "server-only";

import { resolveAdminAccessForAuthUser } from "@/lib/admin-auth.server";
import { listAcademyEmailSettings } from "@/lib/academy-email.server";
import type { AcademyEmailSettings } from "@/lib/academy-email.shared";

export async function listAdminEmailTestAcademies(
  authUserId: string,
): Promise<AcademyEmailSettings[]> {
  const access = await resolveAdminAccessForAuthUser(authUserId);

  if (!access) {
    return [];
  }

  const academies = await listAcademyEmailSettings({ enabledOnly: true });

  if (access.isPlatformSuperAdmin) {
    return academies;
  }

  const accessibleClubIds = new Set(
    access.clubAdminMemberships.map((membership) => membership.clubId),
  );

  return academies.filter((academy) => accessibleClubIds.has(academy.clubId));
}
