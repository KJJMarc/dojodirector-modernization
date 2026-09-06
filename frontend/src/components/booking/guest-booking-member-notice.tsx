import Link from "next/link";
import { UserAccessIcon } from "@/components/layout/home-hero-icons";

const STUDENT_PORTAL_PATH = "/student-portal";

export function GuestBookingMemberNotice() {
  return (
    <section
      className="rounded-xl border border-dojo-border bg-dojo-surface px-3 py-2.5 sm:px-4 sm:py-3"
      aria-label="Student portal booking notice"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated text-dojo-red">
            <UserAccessIcon className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-sm leading-snug text-dojo-muted sm:whitespace-nowrap">
            Members: Please book classes through your Student Portal.
          </p>
        </div>
        <Link
          href={STUDENT_PORTAL_PATH}
          className="guest-booking-portal-login-btn inline-flex min-h-[40px] shrink-0 items-center justify-center self-start rounded-md bg-dojo-red px-5 py-2 text-sm font-semibold text-dojo-white ring-1 ring-dojo-red transition hover:bg-dojo-red-hover active:scale-[0.98] sm:self-center"
        >
          Student Portal Login
        </Link>
      </div>
    </section>
  );
}
