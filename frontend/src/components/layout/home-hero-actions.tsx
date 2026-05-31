import Link from "next/link";
import {
  InstructorShieldIcon,
  UserAccessIcon,
} from "@/components/layout/home-hero-icons";

const STUDENT_PORTAL_LOGIN_PATH = "/student-portal/login";
const INSTRUCTOR_PORTAL_LOGIN_PATH = "/instructor-portal/login";

export function HomeHeroActions() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
      <Link
        href={STUDENT_PORTAL_LOGIN_PATH}
        className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-dojo-red/25 transition hover:bg-dojo-red-hover active:scale-[0.99]"
      >
        <UserAccessIcon className="h-5 w-5 shrink-0" />
        Student Access
      </Link>
      <Link
        href={INSTRUCTOR_PORTAL_LOGIN_PATH}
        className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-md border-2 border-neutral-900 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:border-dojo-red hover:text-dojo-red active:scale-[0.99]"
      >
        <InstructorShieldIcon className="h-5 w-5 shrink-0" />
        Instructor Access
      </Link>
    </div>
  );
}
