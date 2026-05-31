"use client";

import Link from "next/link";
import {
  InstructorShieldIcon,
  UserAccessIcon,
} from "@/components/layout/home-hero-icons";

const STUDENT_PORTAL_LOGIN_PATH = "/student-portal/login";
const INSTRUCTOR_PORTAL_LOGIN_PATH = "/instructor-portal/login";

interface HomeLoginMenuProps {
  onNavigate: () => void;
}

export function HomeLoginMenu({ onNavigate }: HomeLoginMenuProps) {
  return (
    <div
      role="menu"
      className="absolute right-0 mt-2 w-[min(100vw-2rem,18rem)] overflow-hidden rounded-xl border border-neutral-700/80 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-md sm:w-72"
    >
      <Link
        href={STUDENT_PORTAL_LOGIN_PATH}
        role="menuitem"
        onClick={onNavigate}
        className="flex gap-3 rounded-lg px-3 py-3 transition hover:bg-neutral-800"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dojo-red/30 bg-dojo-red/10 text-dojo-red">
          <UserAccessIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-white">Student Login</span>
          <span className="mt-0.5 block text-xs leading-snug text-neutral-400">
            Access your student portal
          </span>
        </span>
      </Link>

      <div className="my-1 h-px bg-neutral-800" aria-hidden="true" />

      <Link
        href={INSTRUCTOR_PORTAL_LOGIN_PATH}
        role="menuitem"
        onClick={onNavigate}
        className="flex gap-3 rounded-lg px-3 py-3 transition hover:bg-neutral-800"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-600 bg-neutral-800/80 text-neutral-200">
          <InstructorShieldIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-white">
            Instructor Login
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-neutral-400">
            Access your instructor portal
          </span>
        </span>
      </Link>
    </div>
  );
}
