import "server-only";

import {
  planInstructorPortalMembershipSync,
  type MembershipRoleStatusRow,
} from "@/lib/instructor-portal-membership-sync.shared";
import { loadPortalAuthLinkProfile } from "@/lib/portal-auth-user.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function loadAllMembershipsForUser(
  userId: string,
): Promise<MembershipRoleStatusRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  return (data ?? []) as MembershipRoleStatusRow[];
}

/**
 * Keeps users.instructor_portal_* aligned with active instructor/admin memberships
 * across all academies. Does not create Supabase auth users.
 */
export async function syncInstructorPortalAccessAfterMembershipChange(
  userId: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  const [profile, memberships] = await Promise.all([
    loadPortalAuthLinkProfile(userId),
    loadAllMembershipsForUser(userId),
  ]);

  if (!profile) {
    return;
  }

  const action = planInstructorPortalMembershipSync({
    memberships,
    profile,
  });

  if (action.type === "none") {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (action.type === "activate") {
    const update: Record<string, string> = {
      instructor_portal_auth_status: "active",
    };

    if (action.instructorPortalLoginEmail) {
      update.instructor_portal_login_email = action.instructorPortalLoginEmail;
    }

    const { error } = await supabase.from("users").update(update).eq("id", userId);

    if (error) {
      throw new Error(
        `Failed to activate instructor portal access: ${error.message}`,
      );
    }

    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ instructor_portal_auth_status: "not_invited" })
    .eq("id", userId);

  if (error) {
    throw new Error(
      `Failed to deactivate instructor portal access: ${error.message}`,
    );
  }
}
