import Link from "next/link";
import { ACTIVE_CLUB_NAME, PRODUCT_NAME } from "@/lib/branding";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dojo-white">
        {PRODUCT_NAME}
      </p>
      <p className="text-sm text-dojo-muted">{ACTIVE_CLUB_NAME}</p>
      <h1 className="text-2xl font-semibold text-dojo-white sm:text-3xl">
        Attendance Register
      </h1>
      <p className="max-w-sm text-sm text-dojo-muted">
        Professional martial arts club management. Fast instructor check-in on
        mobile.
      </p>
      <Link
        href="/attendance"
        className="w-full max-w-xs rounded-lg bg-dojo-red px-5 py-3.5 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover active:scale-[0.98]"
      >
        Open attendance register
      </Link>
    </main>
  );
}
