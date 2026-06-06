export default function AttendanceLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <div className="space-y-3 border-b border-dojo-border pb-4">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-dojo-elevated" />
        <div className="h-6 w-48 animate-pulse rounded bg-dojo-elevated" />
      </div>

      <div className="h-4 w-full max-w-lg animate-pulse rounded bg-dojo-elevated" />

      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-dojo-elevated" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-16 animate-pulse rounded-lg border border-dojo-border bg-dojo-surface"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
