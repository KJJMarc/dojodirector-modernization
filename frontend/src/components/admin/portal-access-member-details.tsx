import type { PortalAccessMemberSummary } from "@/lib/portal-access.shared";

interface PortalAccessMemberDetailsProps {
  member: PortalAccessMemberSummary;
}

export function PortalAccessMemberDetails({ member }: PortalAccessMemberDetailsProps) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold text-dojo-white">{member.fullName}</p>
      <p className="text-dojo-muted">{member.email ?? "No email"}</p>
      <dl className="grid gap-1 text-xs text-dojo-muted sm:grid-cols-2">
        <div>
          <dt className="inline font-medium uppercase tracking-wide">Role: </dt>
          <dd className="inline text-dojo-white">{member.membershipRoleLabel}</dd>
        </div>
        <div>
          <dt className="inline font-medium uppercase tracking-wide">
            Student portal:{" "}
          </dt>
          <dd className="inline text-dojo-white">{member.studentPortalStatusLabel}</dd>
        </div>
        {member.instructorPortalStatusLabel ? (
          <div>
            <dt className="inline font-medium uppercase tracking-wide">
              Instructor portal:{" "}
            </dt>
            <dd className="inline text-dojo-white">
              {member.instructorPortalStatusLabel}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="inline font-medium uppercase tracking-wide">Last invite: </dt>
          <dd className="inline text-dojo-white">
            {member.lastPortalInviteLabel ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
