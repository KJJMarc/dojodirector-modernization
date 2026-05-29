import Link from "next/link";
import { StudentMobileSort } from "@/components/admin/student-mobile-sort";
import {
  AdminStudent,
  AdminStudentSort,
  AdminStudentSortKey,
  buildAdminStudentsListHref,
  formatStudentRole,
  getNextAdminStudentSortDir,
} from "@/lib/admin-students";

interface StudentsListProps {
  students: AdminStudent[];
  totalCount: number;
  searchQuery?: string;
  currentSort: AdminStudentSort;
}

const ATTENDANCE_CARD_YEAR = 2026;

const SORTABLE_COLUMNS: {
  key: AdminStudentSortKey;
  label: string;
}[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "belt_level", label: "Belt level" },
  { key: "attendances", label: "Attendances" },
  { key: "role", label: "Role" },
];

function StudentActions({
  studentId,
  compact = false,
}: {
  studentId: string;
  compact?: boolean;
}) {
  const buttonClassName = compact
    ? "inline-flex min-h-[32px] shrink-0 items-center whitespace-nowrap rounded-md border border-dojo-border bg-dojo-elevated px-2 py-1 text-[11px] font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
    : "min-h-[36px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

  const attendanceCardLabel = compact ? "Card" : "Attendance Card";

  return (
    <div
      className={
        compact
          ? "inline-flex max-w-full flex-row flex-nowrap items-center gap-1"
          : "flex flex-wrap gap-2"
      }
    >
      <Link
        href={`/students/${studentId}/attendance-card?year=${ATTENDANCE_CARD_YEAR}`}
        className={buttonClassName}
        title="Attendance Card"
        aria-label="Attendance Card"
      >
        {attendanceCardLabel}
      </Link>
      <Link
        href={`/admin/students/${studentId}/profile`}
        className={buttonClassName}
        title="Profile"
        aria-label="Profile"
      >
        Profile
      </Link>
    </div>
  );
}

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: AdminStudentSort["dir"];
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

function SortableHeader({
  columnKey,
  label,
  currentSort,
  searchQuery,
}: {
  columnKey: AdminStudentSortKey;
  label: string;
  currentSort: AdminStudentSort;
  searchQuery?: string;
}) {
  const nextDir = getNextAdminStudentSortDir(currentSort, columnKey);
  const href = buildAdminStudentsListHref({
    sort: columnKey,
    dir: nextDir,
    searchQuery,
  });
  const isActive = currentSort.key === columnKey;

  return (
    <th
      className="whitespace-nowrap px-4 py-3 font-semibold align-middle"
      scope="col"
      aria-sort={
        isActive
          ? currentSort.dir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-dojo-white ${
          isActive ? "text-dojo-white" : "text-dojo-muted"
        }`}
      >
        <span>{label}</span>
        <SortIndicator isActive={isActive} direction={currentSort.dir} />
      </Link>
    </th>
  );
}

export function StudentsList({
  students,
  totalCount,
  searchQuery,
  currentSort,
}: StudentsListProps) {
  const countLabel =
    searchQuery && students.length !== totalCount
      ? `${students.length} of ${totalCount} students`
      : `${totalCount} student${totalCount === 1 ? "" : "s"}`;

  return (
    <section aria-label="Students list" className="space-y-3">
      <p className="text-sm text-dojo-muted">{countLabel}</p>

      <StudentMobileSort currentSort={currentSort} searchQuery={searchQuery} />

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
              <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide">
                <tr>
                  {SORTABLE_COLUMNS.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      columnKey={key}
                      label={label}
                      currentSort={currentSort}
                      searchQuery={searchQuery}
                    />
                  ))}
                  <th className="w-[1%] whitespace-nowrap px-3 py-3 align-middle font-semibold text-dojo-muted">
                    Actions
                  </th>
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
                    <td className="w-[1%] whitespace-nowrap px-3 py-3">
                      <StudentActions studentId={student.id} compact />
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
