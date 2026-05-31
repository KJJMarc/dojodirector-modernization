import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";
import { getStudentFullName } from "@/lib/attendance";
import {
  formatInstructorRoleLabel,
  formatMembershipActiveStatus,
  type AdminInstructorRow,
} from "@/lib/admin-instructors.shared";

interface InstructorsListProps {
  clubSlug: string;
  instructors: AdminInstructorRow[];
}

export function InstructorsList({ clubSlug, instructors }: InstructorsListProps) {
  if (instructors.length === 0) {
    return (
      <div className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No instructors found yet.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface sm:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((instructor) => (
              <tr
                key={instructor.id}
                className="border-b border-dojo-border/70 last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-dojo-white">
                  {getStudentFullName(instructor.firstName, instructor.lastName)}
                </td>
                <td className="px-4 py-3 text-dojo-muted">
                  {instructor.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-dojo-white">
                  {formatInstructorRoleLabel(instructor.role)}
                </td>
                <td className="px-4 py-3 text-dojo-white">
                  {formatMembershipActiveStatus(instructor.status)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`${clubAdminPath(clubSlug, "instructors/classes")}?instructorId=${instructor.id}`}
                    className="inline-flex min-h-[32px] items-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
                  >
                    Manage Classes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {instructors.map((instructor) => (
          <li
            key={instructor.id}
            className="rounded-xl border border-dojo-border bg-dojo-surface p-4"
          >
            <p className="font-semibold text-dojo-white">
              {getStudentFullName(instructor.firstName, instructor.lastName)}
            </p>
            <p className="mt-1 text-sm text-dojo-muted">
              {instructor.email ?? "No email"}
            </p>
            <p className="mt-2 text-xs text-dojo-muted">
              Role:{" "}
              <span className="text-dojo-white">
                {formatInstructorRoleLabel(instructor.role)}
              </span>
            </p>
            <p className="mt-1 text-xs text-dojo-muted">
              Status:{" "}
              <span className="text-dojo-white">
                {formatMembershipActiveStatus(instructor.status)}
              </span>
            </p>
            <Link
              href={`${clubAdminPath(clubSlug, "instructors/classes")}?instructorId=${instructor.id}`}
              className="mt-3 inline-flex min-h-[36px] items-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
            >
              Manage Classes
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
