"use client";

import Link from "next/link";
import { useHomeLogin } from "@/components/layout/home-login-context";

/** Temporary instructor portal entry until real auth maps the logged-in user. */
const INSTRUCTOR_LOGIN_PATH = "/instructor/marc-barton";

export function HomeHeroActions() {
  const { openLogin } = useHomeLogin();

  return (
    <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        onClick={openLogin}
        className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-dojo-red/20 transition hover:bg-dojo-red-hover active:scale-[0.99]"
      >
        Student Access
      </button>
      <Link
        href={INSTRUCTOR_LOGIN_PATH}
        className="inline-flex min-h-[48px] items-center justify-center rounded-md border-2 border-neutral-900 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:border-dojo-red hover:text-dojo-red active:scale-[0.99]"
      >
        Instructor Access
      </Link>
    </div>
  );
}
