import { AttendanceStatus } from "@/types/database";

const statusStyles: Record<Exclude<AttendanceStatus, null>, string> = {
  present: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  absent: "bg-rose-500/20 text-rose-300 ring-rose-500/40",
};

export function AttendanceStatusChip({ status }: { status: AttendanceStatus }) {
  if (!status) {
    return (
      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700">
        Unmarked
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
