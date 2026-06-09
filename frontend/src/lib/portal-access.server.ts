import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { loadClubMembershipRows } from "@/lib/admin-club-memberships.server";
import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import {
  formatInstructorPortalStatusLabel,
  formatPortalAccessMembershipRole,
  formatStudentPortalStatusLabel,
  isBulkPortalSetupEligible,
  isValidPortalSetupEmail,
  type PortalAccessBulkSendSummary,
  type PortalAccessMemberSummary,
} from "@/lib/portal-access.shared";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import {
  getPortalSetupAdminStatusForMember,
  sendPortalSetupEmailForMember,
} from "@/lib/portal-setup.server";
import {
  buildPortalSetupAdminStatus,
  canAdminSendPortalSetupEmail,
} from "@/lib/portal-setup.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTAL_ACCESS_PROFILE_COLUMNS =
  "id, first_name, last_name, email, portal_auth_status, portal_invited_at, instructor_portal_auth_status, instructor_portal_invited_at";

const SEARCH_RESULT_LIMIT = 30;
const BULK_SEND_DELAY_MS = 200;

interface PortalAccessProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  portal_auth_status: string | null;
  portal_invited_at: string | null;
  instructor_portal_auth_status: string | null;
  instructor_portal_invited_at: string | null;
}

interface ActiveClubMembershipRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

function logPortalAccessBulk(message: string, meta?: Record<string, string | number>) {
  console.error("[portal-access-bulk]", { message, ...meta });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function memberMatchesQuery(
  profile: PortalAccessProfileRow,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  const firstName = profile.first_name?.trim().toLowerCase() ?? "";
  const lastName = profile.last_name?.trim().toLowerCase() ?? "";
  const email = profile.email?.trim().toLowerCase() ?? "";

  return (
    firstName.includes(normalizedQuery) ||
    lastName.includes(normalizedQuery) ||
    email.includes(normalizedQuery) ||
    `${firstName} ${lastName}`.trim().includes(normalizedQuery)
  );
}

function getLastPortalInviteAt(
  portalInvitedAt: string | null,
  instructorInvitedAt: string | null,
): string | null {
  const raw = portalInvitedAt ?? instructorInvitedAt;

  if (!raw?.trim()) {
    return null;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : raw;
}

function formatLastPortalInviteLabel(
  portalInvitedAt: string | null,
  instructorInvitedAt: string | null,
) {
  const raw = portalInvitedAt ?? instructorInvitedAt;

  if (!raw?.trim()) {
    return null;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

async function loadPortalAccessProfilesByIds(
  userIds: string[],
): Promise<Map<string, PortalAccessProfileRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const profiles = new Map<string, PortalAccessProfileRow>();
  const batchSize = 100;

  for (let index = 0; index < userIds.length; index += batchSize) {
    const batch = userIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("users")
      .select(PORTAL_ACCESS_PROFILE_COLUMNS)
      .in("id", batch);

    if (error) {
      throw new Error(`Failed to load member profiles: ${error.message}`);
    }

    for (const row of (data ?? []) as PortalAccessProfileRow[]) {
      profiles.set(row.id, row);
    }
  }

  return profiles;
}

async function loadActiveClubMemberships(
  clubId: string,
): Promise<ActiveClubMembershipRow[]> {
  const membershipRows = await loadClubMembershipRows(clubId);

  return membershipRows.filter(
    (membership) =>
      isActiveMembershipStatus(membership.status) &&
      !isSuperAdminMembershipRole(membership.role),
  );
}

async function loadInstructorMembershipElsewhereByUserId(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, boolean>();
  }

  const supabase = getSupabaseAdminClient();
  const result = new Map<string, boolean>();

  for (const userId of userIds) {
    result.set(userId, false);
  }

  const batchSize = 100;

  for (let index = 0; index < userIds.length; index += batchSize) {
    const batch = userIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, role, status")
      .in("user_id", batch)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to load memberships: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (isInstructorPortalMembershipRole(row.role)) {
        result.set(row.user_id, true);
      }
    }
  }

  return result;
}

function buildPortalAccessMemberSummary(input: {
  profile: PortalAccessProfileRow;
  membership: ActiveClubMembershipRow;
  hasInstructorPortalMembershipAnywhere: boolean;
}): PortalAccessMemberSummary {
  const setupStatus = buildPortalSetupAdminStatus({
    profileEmail: input.profile.email,
    portalAuthStatus: input.profile.portal_auth_status,
    portalInvitedAt: input.profile.portal_invited_at,
    instructorPortalAuthStatus: input.profile.instructor_portal_auth_status,
    instructorPortalInvitedAt: input.profile.instructor_portal_invited_at,
    membershipRole: input.membership.role,
    hasSuperAdminMembership: false,
    hasInstructorPortalMembershipAnywhere: input.hasInstructorPortalMembershipAnywhere,
  });

  const canSend =
    canAdminSendPortalSetupEmail({
      profileEmail: input.profile.email,
      membershipStatus: input.membership.status,
    }) && setupStatus.canSendSetupEmail;

  return {
    userId: input.profile.id,
    fullName: getStudentFullName(input.profile.first_name, input.profile.last_name),
    email: input.profile.email?.trim() || null,
    membershipRole: input.membership.role,
    membershipRoleLabel: formatPortalAccessMembershipRole(input.membership.role),
    studentPortalStatusLabel: formatStudentPortalStatusLabel(
      input.profile.portal_auth_status,
    ),
    instructorPortalStatusLabel: formatInstructorPortalStatusLabel(
      input.membership.role,
      input.profile.instructor_portal_auth_status,
    ),
    lastPortalInviteLabel: formatLastPortalInviteLabel(
      input.profile.portal_invited_at,
      input.profile.instructor_portal_invited_at,
    ),
    lastPortalInviteAt: getLastPortalInviteAt(
      input.profile.portal_invited_at,
      input.profile.instructor_portal_invited_at,
    ),
    canSendSetupEmail: canSend,
    isBulkEligible: isBulkPortalSetupEligible({
      profileEmail: input.profile.email,
      membershipStatus: input.membership.status,
      portalAuthStatus: input.profile.portal_auth_status,
      portalInvitedAt: input.profile.portal_invited_at,
      instructorPortalAuthStatus: input.profile.instructor_portal_auth_status,
      instructorPortalInvitedAt: input.profile.instructor_portal_invited_at,
      membershipRole: input.membership.role,
      hasInstructorPortalMembershipAnywhere:
        input.hasInstructorPortalMembershipAnywhere,
    }),
  };
}

async function loadPortalAccessMemberContexts(clubId: string) {
  const memberships = await loadActiveClubMemberships(clubId);
  const userIds = Array.from(new Set(memberships.map((row) => row.user_id)));
  const [profilesById, instructorElsewhereByUserId] = await Promise.all([
    loadPortalAccessProfilesByIds(userIds),
    loadInstructorMembershipElsewhereByUserId(userIds),
  ]);

  const membershipByUserId = new Map(
    memberships.map((membership) => [membership.user_id, membership]),
  );

  return { memberships, profilesById, membershipByUserId, instructorElsewhereByUserId };
}

export async function searchPortalAccessMembers(
  clubId: string,
  query: string,
): Promise<PortalAccessMemberSummary[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const { memberships, profilesById, membershipByUserId, instructorElsewhereByUserId } =
    await loadPortalAccessMemberContexts(clubId);

  const matches: PortalAccessMemberSummary[] = [];

  for (const membership of memberships) {
    const profile = profilesById.get(membership.user_id);

    if (!profile || !memberMatchesQuery(profile, trimmedQuery)) {
      continue;
    }

    const clubMembership = membershipByUserId.get(membership.user_id);

    if (!clubMembership) {
      continue;
    }

    matches.push(
      buildPortalAccessMemberSummary({
        profile,
        membership: clubMembership,
        hasInstructorPortalMembershipAnywhere: Boolean(
          instructorElsewhereByUserId.get(membership.user_id),
        ),
      }),
    );

    if (matches.length >= SEARCH_RESULT_LIMIT) {
      break;
    }
  }

  return matches.sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export async function countBulkEligiblePortalAccessMembers(
  clubId: string,
): Promise<number> {
  const eligible = await listBulkEligiblePortalAccessMembers(clubId);
  return eligible.length;
}

export async function listBulkEligiblePortalAccessMembers(clubId: string) {
  const { memberships, profilesById, membershipByUserId, instructorElsewhereByUserId } =
    await loadPortalAccessMemberContexts(clubId);

  const eligible: Array<{
    summary: PortalAccessMemberSummary;
    membership: ActiveClubMembershipRow;
  }> = [];

  for (const membership of memberships) {
    const profile = profilesById.get(membership.user_id);
    const clubMembership = membershipByUserId.get(membership.user_id);

    if (!profile || !clubMembership) {
      continue;
    }

    const summary = buildPortalAccessMemberSummary({
      profile,
      membership: clubMembership,
      hasInstructorPortalMembershipAnywhere: Boolean(
        instructorElsewhereByUserId.get(membership.user_id),
      ),
    });

    if (!summary.isBulkEligible) {
      continue;
    }

    eligible.push({ summary, membership: clubMembership });
  }

  return eligible.sort((left, right) =>
    left.summary.fullName.localeCompare(right.summary.fullName),
  );
}

export async function sendPortalAccessEmailToMember(input: {
  clubId: string;
  clubSlug: string;
  academyName: string;
  userId: string;
}) {
  const { membershipByUserId, profilesById } = await loadPortalAccessMemberContexts(
    input.clubId,
  );
  const membership = membershipByUserId.get(input.userId);
  const profile = profilesById.get(input.userId);

  if (!membership || !profile) {
    throw new Error("Member not found at this academy.");
  }

  const status = await getPortalSetupAdminStatusForMember({
    userId: input.userId,
    profileEmail: profile.email,
    membershipRole: membership.role,
    membershipStatus: membership.status,
  });

  if (!status.canSendSetupEmail) {
    if (!isValidPortalSetupEmail(profile.email)) {
      throw new Error("Add a profile email before sending a portal setup email.");
    }

    throw new Error("Portal access is already active for this member.");
  }

  return sendPortalSetupEmailForMember({
    userId: input.userId,
    clubSlug: input.clubSlug,
    academyName: input.academyName,
    membershipRole: membership.role,
    membershipStatus: membership.status,
    profileEmail: profile.email,
  });
}

export async function listEligiblePortalAccessMembersForReview(clubId: string) {
  const eligible = await listBulkEligiblePortalAccessMembers(clubId);

  return eligible.map((row) => row.summary);
}

async function sendPortalAccessEmailsToMembers(input: {
  clubId: string;
  clubSlug: string;
  academyName: string;
  members: Array<{
    summary: PortalAccessMemberSummary;
    membership: ActiveClubMembershipRow;
  }>;
  initialSkippedCount?: number;
}): Promise<PortalAccessBulkSendSummary> {
  const summary: PortalAccessBulkSendSummary = {
    sentCount: 0,
    skippedCount: input.initialSkippedCount ?? 0,
    failedCount: 0,
    failures: [],
  };

  logPortalAccessBulk("Starting selected portal setup send", {
    clubSlug: input.clubSlug,
    memberCount: input.members.length,
  });

  for (let index = 0; index < input.members.length; index += 1) {
    const { summary: member, membership } = input.members[index];

    if (!member.isBulkEligible || !isValidPortalSetupEmail(member.email)) {
      summary.skippedCount += 1;
      continue;
    }

    try {
      await sendPortalSetupEmailForMember({
        userId: member.userId,
        clubSlug: input.clubSlug,
        academyName: input.academyName,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        profileEmail: member.email,
      });
      summary.sentCount += 1;
    } catch (error) {
      summary.failedCount += 1;
      const reason =
        error instanceof Error ? error.message : "Unable to send portal setup email.";
      summary.failures.push({
        fullName: member.fullName,
        email: member.email,
        reason,
      });
      logPortalAccessBulk("Selected send failed for member", {
        userId: member.userId,
        email: member.email ?? "",
        reason,
      });
    }

    if (index < input.members.length - 1) {
      await delay(BULK_SEND_DELAY_MS);
    }
  }

  logPortalAccessBulk("Selected portal setup send finished", {
    sentCount: summary.sentCount,
    skippedCount: summary.skippedCount,
    failedCount: summary.failedCount,
  });

  return summary;
}

export async function sendSelectedPortalAccessEmails(input: {
  clubId: string;
  clubSlug: string;
  academyName: string;
  userIds: string[];
}): Promise<PortalAccessBulkSendSummary & { selectedCount: number }> {
  const uniqueUserIds = Array.from(
    new Set(input.userIds.map((userId) => userId.trim()).filter(Boolean)),
  );

  if (uniqueUserIds.length === 0) {
    throw new Error("Select at least one student to invite.");
  }

  const eligible = await listBulkEligiblePortalAccessMembers(input.clubId);
  const eligibleByUserId = new Map(
    eligible.map((row) => [row.summary.userId, row]),
  );

  const toSend: Array<{
    summary: PortalAccessMemberSummary;
    membership: ActiveClubMembershipRow;
  }> = [];
  let skippedCount = 0;

  for (const userId of uniqueUserIds) {
    const row = eligibleByUserId.get(userId);

    if (row) {
      toSend.push(row);
    } else {
      skippedCount += 1;
    }
  }

  if (toSend.length === 0) {
    throw new Error(
      "None of the selected members are eligible for a portal setup email.",
    );
  }

  const summary = await sendPortalAccessEmailsToMembers({
    clubId: input.clubId,
    clubSlug: input.clubSlug,
    academyName: input.academyName,
    members: toSend,
    initialSkippedCount: skippedCount,
  });

  return {
    ...summary,
    selectedCount: uniqueUserIds.length,
  };
}
