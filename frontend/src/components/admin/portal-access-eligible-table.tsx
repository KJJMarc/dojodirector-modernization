"use client";

import {
  formatPortalAccessLastInviteDisplay,
  getNextPortalAccessEligibleSortDir,
  type PortalAccessEligibleSort,
  type PortalAccessEligibleSortKey,
  type PortalAccessMemberSummary,
} from "@/lib/portal-access.shared";

const SORT_COLUMNS: Array<{ key: PortalAccessEligibleSortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
];

const LAST_INVITE_SORT_KEY: PortalAccessEligibleSortKey = "last_invite";

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: PortalAccessEligibleSort["dir"];
}) {
  return (
    <span
      className="inline-flex w-3 shrink-0 items-center justify-center text-dojo-red"
      aria-hidden="true"
    >
      {isActive ? (direction === "asc" ? "↑" : "↓") : ""}
    </span>
  );
}

interface PortalAccessEligibleTableProps {
  members: PortalAccessMemberSummary[];
  selectedIds: Set<string>;
  sort: PortalAccessEligibleSort;
  onSortChange: (sort: PortalAccessEligibleSort) => void;
  onToggleMember: (userId: string, checked: boolean) => void;
  onInviteMember: (userId: string) => void;
  invitingUserId: string | null;
  isInvitePending: boolean;
}

export function PortalAccessEligibleTable({
  members,
  selectedIds,
  sort,
  onSortChange,
  onToggleMember,
  onInviteMember,
  invitingUserId,
  isInvitePending,
}: PortalAccessEligibleTableProps) {
  function handleSortColumn(columnKey: PortalAccessEligibleSortKey) {
    onSortChange({
      key: columnKey,
      dir: getNextPortalAccessEligibleSortDir(sort, columnKey),
    });
  }

  function handleRowClick(userId: string) {
    onToggleMember(userId, !selectedIds.has(userId));
  }

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dojo-border bg-dojo-elevated/60 px-3 py-6 text-center text-sm text-dojo-muted">
        No students match your search.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dojo-border bg-dojo-surface">
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted shadow-[0_1px_0_0_var(--dojo-border,#2a2a2a)]">
            <tr>
              <th className="w-10 px-2 py-2 font-semibold" scope="col">
                <span className="sr-only">Select</span>
              </th>
              {SORT_COLUMNS.map(({ key, label }) => {
                const isActive = sort.key === key;

                return (
                  <th
                    key={key}
                    className="whitespace-nowrap px-2 py-2 font-semibold align-middle"
                    scope="col"
                    aria-sort={
                      isActive
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleSortColumn(key)}
                      className={`inline-flex items-center gap-1 transition hover:text-dojo-white ${
                        isActive ? "text-dojo-white" : "text-dojo-muted"
                      }`}
                    >
                      <span>{label}</span>
                      <SortIndicator isActive={isActive} direction={sort.dir} />
                    </button>
                  </th>
                );
              })}
              <th className="whitespace-nowrap px-2 py-2 font-semibold" scope="col">
                Portal Status
              </th>
              <th
                className="whitespace-nowrap px-2 py-2 font-semibold align-middle"
                scope="col"
                aria-sort={
                  sort.key === LAST_INVITE_SORT_KEY
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => handleSortColumn(LAST_INVITE_SORT_KEY)}
                  className={`inline-flex items-center gap-1 transition hover:text-dojo-white ${
                    sort.key === LAST_INVITE_SORT_KEY
                      ? "text-dojo-white"
                      : "text-dojo-muted"
                  }`}
                >
                  <span>Last Invite</span>
                  <SortIndicator
                    isActive={sort.key === LAST_INVITE_SORT_KEY}
                    direction={sort.dir}
                  />
                </button>
              </th>
              <th
                className="w-[1%] whitespace-nowrap px-2 py-2 font-semibold"
                scope="col"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dojo-border">
            {members.map((member) => {
              const checked = selectedIds.has(member.userId);
              const isInviting =
                isInvitePending && invitingUserId === member.userId;

              return (
                <tr
                  key={member.userId}
                  onClick={() => handleRowClick(member.userId)}
                  className={`cursor-pointer transition hover:bg-dojo-elevated/80 ${
                    checked ? "bg-dojo-red/5" : ""
                  }`}
                >
                  <td className="w-10 px-2 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        onToggleMember(member.userId, event.target.checked)
                      }
                      aria-label={`Select ${member.fullName}`}
                      className="h-3.5 w-3.5 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red/40"
                    />
                  </td>
                  <td className="max-w-[12rem] truncate px-2 py-1.5 font-medium text-dojo-white">
                    {member.fullName}
                  </td>
                  <td className="max-w-[14rem] truncate px-2 py-1.5 text-dojo-muted">
                    {member.email ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-dojo-white">
                    {member.membershipRoleLabel}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-dojo-white">
                    {member.studentPortalStatusLabel}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-dojo-muted tabular-nums">
                    {formatPortalAccessLastInviteDisplay(member.lastPortalInviteLabel)}
                  </td>
                  <td
                    className="w-[1%] whitespace-nowrap px-2 py-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={!member.canSendSetupEmail || isInvitePending}
                      onClick={() => onInviteMember(member.userId)}
                      className="inline-flex min-h-[28px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-2.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:bg-dojo-surface disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isInviting ? "Sending…" : "Invite"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
