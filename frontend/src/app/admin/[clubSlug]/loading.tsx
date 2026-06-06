export default function AdminDashboardLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <div className="space-y-3 border-b border-dojo-border pb-4">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-dojo-elevated" />
        <div className="h-6 w-44 animate-pulse rounded bg-dojo-elevated" />
        <div className="h-6 w-40 animate-pulse rounded bg-dojo-elevated" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-dojo-border bg-dojo-surface"
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-dojo-border bg-dojo-surface"
          />
        ))}
      </div>
    </main>
  );
}
