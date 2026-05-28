import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">
        Kingston Jiu Jitsu
      </p>
      <h1 className="text-3xl font-semibold">Instructor Attendance Register</h1>
      <p className="text-sm text-slate-300">
        Fast class check-in workflow optimized for mobile.
      </p>
      <Link
        href="/attendance"
        className="w-full rounded-xl bg-emerald-500 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Open today&apos;s register
      </Link>
    </main>
  );
}
