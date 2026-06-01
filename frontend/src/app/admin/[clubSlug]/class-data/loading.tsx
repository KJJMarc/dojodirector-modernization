export default function ClassDataLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-dojo-elevated" />
      <div className="h-4 w-64 animate-pulse rounded bg-dojo-elevated" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg border border-dojo-border bg-dojo-surface"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-dojo-border bg-dojo-surface" />
      <div className="h-64 animate-pulse rounded-xl border border-dojo-border bg-dojo-surface" />
    </main>
  );
}
