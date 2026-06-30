export default function InstructorKidsPromotionCandidatesLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex items-center gap-3 text-sm text-dojo-muted">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-dojo-muted border-t-dojo-red"
          />
          Loading promotion candidates…
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-dojo-border bg-dojo-elevated"
          />
        ))}
      </div>
    </div>
  );
}
