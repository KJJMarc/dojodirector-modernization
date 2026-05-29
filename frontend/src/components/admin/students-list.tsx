import Link from "next/link";
import {
  AdminStudent,
  formatStudentRole,
} from "@/lib/admin-students";

interface StudentsListProps {
  students: AdminStudent[];
  totalCount: number;
  searchQuery?: string;
}

const ATTENDANCE_CARD_YEAR = 2026;

function StudentActions({ studentId }: { studentId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/students/${studentId}/attendance-card?year=${ATTENDANCE_CARD_YEAR}`}
        className="min-h-[36px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
      >
        Attendance Card
      </Link>
      <Link
        href={`/admin/students/${studentId}/profile`}
        className="min-h-[36px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
      >
        Profile
      </Link>
    </div>
  );
}

export function StudentsList({
  students,
  totalCount,
  searchQuery,
}: StudentsListProps) {
  const countLabel =
    searchQuery && students.length !== totalCount
      ? `${students.length} of ${totalCount} students`
      : `${totalCount} student${totalCount === 1 ? "" : "s"}`;

  return (
    <section aria-label="Students list" className="space-y-3">
      <p className="text-sm text-dojo-muted">{countLabel}</p>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          {searchQuery
            ? "No students match your search."
            : "No students found for this club."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface sm:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">First name</th>
                  <th className="px-4 py-3 font-semibold">Last name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Belt level</th>
                  <th className="px-4 py-3 font-semibold">Attendances</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dojo-border">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 text-dojo-white">
                      {student.firstName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-dojo-white">
                      {student.lastName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {student.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-dojo-white">
                      {student.beltLabel}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-dojo-white">
                      {student.attendanceTotal}
                    </td>
                    <td className="px-4 py-3 text-dojo-white">
                      {formatStudentRole(student.role)}
                    </td>
                    <td className="px-4 py-3">
                      <StudentActions studentId={student.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 sm:hidden">
            {students.map((student) => (
              <li
                key={student.id}
                className="rounded-xl border border-dojo-border bg-dojo-surface p-4"
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-base font-semibold text-dojo-white">
                      {[student.firstName, student.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unknown student"}
                    </p>
                    <p className="text-sm text-dojo-muted">
                      {student.email ?? "No email"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-wide text-dojo-muted">
                    <p>
                      Belt:{" "}
                      <span className="normal-case text-dojo-white">
                        {student.beltLabel}
                      </span>
                    </p>
                    <p>
                      Attendances:{" "}
                      <span className="tabular-nums text-dojo-white">
                        {student.attendanceTotal}
                      </span>
                    </p>
                    <p className="col-span-2">
                      Role:{" "}
                      <span className="text-dojo-white">
                        {formatStudentRole(student.role)}
                      </span>
                    </p>
                  </div>
                  <StudentActions studentId={student.id} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
