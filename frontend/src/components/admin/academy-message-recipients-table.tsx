"use client";

import type { AcademyMessageRecipient } from "@/lib/academy-messaging.shared";

interface AcademyMessageRecipientsTableProps {
  recipients: AcademyMessageRecipient[];
  selectedIds: Set<string>;
  onToggleMember: (userId: string, checked: boolean) => void;
}

export function AcademyMessageRecipientsTable({
  recipients,
  selectedIds,
  onToggleMember,
}: AcademyMessageRecipientsTableProps) {
  function handleRowClick(userId: string) {
    onToggleMember(userId, !selectedIds.has(userId));
  }

  if (recipients.length === 0) {
    return (
      <p className="rounded-lg border border-dojo-border bg-dojo-elevated/60 px-3 py-6 text-center text-sm text-dojo-muted">
        No recipients match your search.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dojo-border bg-dojo-surface">
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
            <tr>
              <th className="w-10 px-2 py-2 font-semibold" scope="col">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                Name
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                Email
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                Role
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dojo-border">
            {recipients.map((recipient) => {
              const checked = selectedIds.has(recipient.userId);

              return (
                <tr
                  key={recipient.userId}
                  onClick={() => handleRowClick(recipient.userId)}
                  className={`cursor-pointer transition hover:bg-dojo-elevated/80 ${
                    checked ? "bg-dojo-red/5" : ""
                  }`}
                >
                  <td
                    className="w-10 px-2 py-1.5 align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        onToggleMember(recipient.userId, event.target.checked)
                      }
                      aria-label={`Select ${recipient.fullName}`}
                      className="h-3.5 w-3.5 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red/40"
                    />
                  </td>
                  <td className="max-w-[12rem] truncate px-2 py-1.5 font-medium text-dojo-white">
                    {recipient.fullName}
                  </td>
                  <td className="max-w-[14rem] truncate px-2 py-1.5 text-dojo-muted">
                    {recipient.email ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-dojo-white">
                    {recipient.membershipRoleLabel}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-dojo-muted">
                    {recipient.membershipStatusLabel}
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
