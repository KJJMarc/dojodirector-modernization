import Link from "next/link";
import {
  type AttendanceRegisterNavContext,
  resolveAttendanceRegisterBackLink,
} from "@/lib/attendance-register-navigation.shared";

interface AttendanceRegisterBackLinkProps {
  context: AttendanceRegisterNavContext;
}

export function AttendanceRegisterBackLink({
  context,
}: AttendanceRegisterBackLinkProps) {
  const { href, label } = resolveAttendanceRegisterBackLink(context);

  return (
    <Link
      href={href}
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      {label}
    </Link>
  );
}
