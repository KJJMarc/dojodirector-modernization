export default function PromotionCandidatesLoading() {
  return (
    <div className="mx-auto min-h-[40vh] w-full max-w-6xl px-3 py-12 sm:px-5">
      <div className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-6">
        <p className="text-sm font-semibold text-dojo-white">
          Calculating promotion candidates…
        </p>
        <p className="text-xs text-dojo-muted">
          Loading belt levels, grading history, and BJJ attendance for eligible
          students. This may take a few seconds for larger academies.
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-dojo-elevated"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-dojo-red/70" />
        </div>
      </div>
    </div>
  );
}
