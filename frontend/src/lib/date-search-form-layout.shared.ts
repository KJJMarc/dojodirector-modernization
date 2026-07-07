const DATE_SEARCH_WIDTH =
  "min-w-0 w-full max-w-full box-border" as const;

/**
 * Shared responsive layout for admin/instructor date search toolbars.
 *
 * Stacked through lg (<1024px) for portrait phones, landscape PWA, and tablets.
 * Date field and action buttons share one width-constrained controls wrapper.
 */
export const DATE_SEARCH_FORM_LAYOUT = {
  card: `${DATE_SEARCH_WIDTH} overflow-hidden`,

  form: DATE_SEARCH_WIDTH,

  controls: [
    DATE_SEARCH_WIDTH,
    "grid gap-3 overflow-hidden",
    "grid-cols-1",
    "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
  ].join(" "),

  fieldWrapper: `${DATE_SEARCH_WIDTH} space-y-1.5 overflow-hidden`,

  fieldInputWrapper: `${DATE_SEARCH_WIDTH} overflow-hidden`,

  fieldInput: "date-search-input",

  actionRow: [
    DATE_SEARCH_WIDTH,
    "flex flex-col gap-2 overflow-hidden",
    "lg:w-auto lg:max-w-none lg:flex-row lg:flex-wrap",
  ].join(" "),

  nav: [
    DATE_SEARCH_WIDTH,
    "grid grid-cols-2 gap-2 overflow-hidden",
    "sm:flex sm:flex-wrap",
  ].join(" "),

  actionButton: [
    DATE_SEARCH_WIDTH,
    "flex min-h-[44px] items-center justify-center overflow-hidden",
    "rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold",
    "text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red",
    "lg:w-auto lg:max-w-none lg:shrink-0",
  ].join(" "),

  navButton: [
    DATE_SEARCH_WIDTH,
    "flex min-h-[44px] items-center justify-center overflow-hidden",
    "rounded-md border border-dojo-border bg-dojo-black",
    "px-3 text-xs font-semibold text-dojo-muted transition",
    "hover:border-dojo-red/50 hover:text-dojo-white",
    "sm:w-auto sm:max-w-none sm:flex-none sm:px-4 sm:text-sm lg:shrink-0",
  ].join(" "),
} as const;
