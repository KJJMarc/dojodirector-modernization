export default function AttendanceSessionLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex items-center gap-3 text-sm text-dojo-muted">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-dojo-muted border-t-dojo-red"
          />
          Loading attendance register…
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-lg border border-dojo-border bg-dojo-surface"
          />
        ))}
      </div>
    </div>
  );
}
