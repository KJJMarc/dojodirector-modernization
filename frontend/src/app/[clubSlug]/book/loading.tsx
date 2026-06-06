export default function GuestBookLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-4 pb-8 sm:px-5">
        <div className="space-y-3 border-b border-dojo-border pb-4">
          <div className="h-10 w-56 animate-pulse rounded-lg bg-dojo-elevated" />
          <div className="h-6 w-44 animate-pulse rounded bg-dojo-elevated" />
          <div className="h-6 w-36 animate-pulse rounded bg-dojo-elevated" />
        </div>

        <div className="h-4 w-full max-w-md animate-pulse rounded bg-dojo-elevated" />

        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <section key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-dojo-elevated" />
              <div className="h-28 animate-pulse rounded-lg border border-dojo-border bg-dojo-elevated" />
              <div className="h-28 animate-pulse rounded-lg border border-dojo-border bg-dojo-elevated" />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
