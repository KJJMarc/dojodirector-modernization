import Link from "next/link";
import { ProgrammeStudentRowActions } from "@/components/admin/programme-student-row-actions";
import { StudentMobileSort } from "@/components/admin/student-mobile-sort";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  AdminStudent,
  AdminStudentListStatusFilter,
  AdminStudentSort,
  AdminStudentSortKey,
  buildAdminStudentsListHref,
  DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
  formatAdminStudentCountLabel,
  formatStudentRole,
  getNextAdminStudentSortDir,
} from "@/lib/admin-students";

interface StudentsListProps {
  clubSlug: string;
  students: AdminStudent[];
  totalCount: number;
  searchQuery?: string;
  statusFilter?: AdminStudentListStatusFilter;
  currentSort: AdminStudentSort;
  memberLabel?: string;
  memberLabelPlural?: string;
  listAriaLabel?: string;
  showBjjColumns?: boolean;
  showAttendanceCard?: boolean;
  studentsPath?: string;
  emptyMessage?: string;
  showProgrammeMembershipActions?: boolean;
  programmeSlug?: string;
  programmeName?: string;
}

const ATTENDANCE_CARD_YEAR = 2026;

const SORTABLE_COLUMNS: {
  key: AdminStudentSortKey;
  label: string;
}[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "belt_level", label: "Belt Level" },
  { key: "attendances", label: "Attendances" },
  { key: "role", label: "Role" },
];

function BeltLevelCell({
  beltLabel,
  considerPromotion,
}: {
  beltLabel: string;
  considerPromotion: boolean;
}) {
  if (!considerPromotion) {
    return <>{beltLabel}</>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{beltLabel}</span>
      <span
        className="inline-flex rounded-full bg-dojo-red/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dojo-red"
        title="Consider promotion"
      >
        *
      </span>
      <span className="sr-only">Consider promotion</span>
    </span>
  );
}

function StudentActions({
  clubSlug,
  studentId,
  compact = false,
  showAttendanceCard = true,
}: {
  clubSlug: string;
  studentId: string;
  compact?: boolean;
  showAttendanceCard?: boolean;
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
      {showAttendanceCard ? (
        <Link
          href={`/students/${studentId}/attendance-card?year=${ATTENDANCE_CARD_YEAR}`}
          className={buttonClassName}
          title="Attendance Card"
          aria-label="Attendance Card"
        >
          {attendanceCardLabel}
        </Link>
      ) : null}
      <Link
        href={clubAdminPath(clubSlug, `students/${studentId}/profile`)}
        className={buttonClassName}
        title="Profile"
        aria-label="Profile"
      >
        Profile
      </Link>
    </div>
  );
}

function formatStudentDisplayName(student: AdminStudent) {
  return (
    [student.firstName, student.lastName].filter(Boolean).join(" ") || "this student"
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
  clubSlug,
  columnKey,
  label,
  currentSort,
  searchQuery,
  statusFilter,
  studentsPath,
}: {
  clubSlug: string;
  columnKey: AdminStudentSortKey;
  label: string;
  currentSort: AdminStudentSort;
  searchQuery?: string;
  statusFilter?: AdminStudentListStatusFilter;
  studentsPath?: string;
}) {
  const nextDir = getNextAdminStudentSortDir(currentSort, columnKey);
  const href = buildAdminStudentsListHref({
    clubSlug,
    sort: columnKey,
    dir: nextDir,
    searchQuery,
    studentsPath,
    statusFilter,
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
  clubSlug,
  students,
  totalCount,
  searchQuery,
  statusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
  currentSort,
  memberLabel = "student",
  memberLabelPlural = "students",
  listAriaLabel = "BJJ Students list",
  showBjjColumns = true,
  showAttendanceCard = true,
  studentsPath = "students",
  emptyMessage,
  showProgrammeMembershipActions = false,
  programmeSlug,
  programmeName,
}: StudentsListProps) {
  const visibleColumns = SORTABLE_COLUMNS.filter(({ key }) => {
    if (!showBjjColumns && (key === "belt_level" || key === "attendances")) {
      return false;
    }

    return true;
  });

  const isSearchFiltered = Boolean(searchQuery?.trim());
  const countLabel = formatAdminStudentCountLabel({
    count: totalCount,
    filter: statusFilter,
    memberLabel,
    memberLabelPlural,
    visibleCount: isSearchFiltered ? students.length : undefined,
  });

  const defaultEmptyMessage = `No ${memberLabelPlural} found for this programme.`;

  return (
    <section aria-label={listAriaLabel} className="space-y-3">
      <p className="text-sm text-dojo-muted">{countLabel}</p>

      <StudentMobileSort
        clubSlug={clubSlug}
        currentSort={currentSort}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        studentsPath={studentsPath}
        showBjjColumns={showBjjColumns}
      />

      {students.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          {isSearchFiltered
            ? `No ${memberLabelPlural} match your search.`
            : (emptyMessage ?? defaultEmptyMessage)}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface sm:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide">
                <tr>
                  {visibleColumns.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      clubSlug={clubSlug}
                      columnKey={key}
                      label={label}
                      currentSort={currentSort}
                      searchQuery={searchQuery}
                      statusFilter={statusFilter}
                      studentsPath={studentsPath}
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
                    {showBjjColumns ? (
                      <>
                        <td className="px-4 py-3 text-dojo-white">
                          <BeltLevelCell
                            beltLabel={student.beltLabel}
                            considerPromotion={student.considerPromotion}
                          />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-dojo-white">
                          {student.attendanceTotal}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3 text-dojo-white">
                      {formatStudentRole(student.role)}
                    </td>
                    <td className="w-[1%] whitespace-nowrap px-3 py-3">
                      {showProgrammeMembershipActions &&
                      programmeSlug &&
                      programmeName ? (
                        <ProgrammeStudentRowActions
                          clubSlug={clubSlug}
                          programmeSlug={programmeSlug}
                          programmeName={programmeName}
                          studentId={student.id}
                          studentName={formatStudentDisplayName(student)}
                          compact
                          showAttendanceCard={showAttendanceCard}
                        />
                      ) : (
                        <StudentActions
                          clubSlug={clubSlug}
                          studentId={student.id}
                          compact
                          showAttendanceCard={showAttendanceCard}
                        />
                      )}
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
                        .join(" ") || "Unknown member"}
                    </p>
                    <p className="text-sm text-dojo-muted">
                      {student.email ?? "No email"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-wide text-dojo-muted">
                    {showBjjColumns ? (
                      <>
                        <p>
                          Belt:{" "}
                          <span className="normal-case text-dojo-white">
                            <BeltLevelCell
                              beltLabel={student.beltLabel}
                              considerPromotion={student.considerPromotion}
                            />
                          </span>
                        </p>
                        <p>
                          Attendances:{" "}
                          <span className="tabular-nums text-dojo-white">
                            {student.attendanceTotal}
                          </span>
                        </p>
                      </>
                    ) : null}
                    <p className={showBjjColumns ? "col-span-2" : "col-span-2"}>
                      Role:{" "}
                      <span className="text-dojo-white">
                        {formatStudentRole(student.role)}
                      </span>
                    </p>
                  </div>
                  {showProgrammeMembershipActions &&
                  programmeSlug &&
                  programmeName ? (
                    <ProgrammeStudentRowActions
                      clubSlug={clubSlug}
                      programmeSlug={programmeSlug}
                      programmeName={programmeName}
                      studentId={student.id}
                      studentName={formatStudentDisplayName(student)}
                      showAttendanceCard={showAttendanceCard}
                    />
                  ) : (
                    <StudentActions
                      clubSlug={clubSlug}
                      studentId={student.id}
                      showAttendanceCard={showAttendanceCard}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
