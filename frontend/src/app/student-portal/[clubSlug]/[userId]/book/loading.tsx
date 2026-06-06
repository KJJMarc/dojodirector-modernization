export default function StudentPortalBookLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <div className="space-y-3 border-b border-dojo-border pb-4">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-dojo-elevated" />
        <div className="h-6 w-40 animate-pulse rounded bg-dojo-elevated" />
        <div className="h-6 w-32 animate-pulse rounded bg-dojo-elevated" />
      </div>

      <div className="h-10 w-full animate-pulse rounded-lg bg-dojo-elevated" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <div className="space-y-1 border-b border-dojo-border pb-2">
              <div className="h-4 w-28 animate-pulse rounded bg-dojo-elevated" />
              <div className="h-3 w-20 animate-pulse rounded bg-dojo-elevated" />
            </div>
            <div className="h-36 animate-pulse rounded-lg border border-dojo-border bg-dojo-elevated" />
          </section>
        ))}
      </div>
    </main>
  );
}
