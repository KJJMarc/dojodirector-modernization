/**
 * Shared responsive layout for admin/instructor date search toolbars.
 *
 * Stacked through lg (<1024px) for portrait phones, landscape PWA, and tablets.
 * Date field and action buttons sit side-by-side only at lg+ when width is sufficient.
 */
export const DATE_SEARCH_FORM_LAYOUT = {
  card: "min-w-0 w-full max-w-full overflow-hidden box-border",

  form: [
    "grid w-full min-w-0 max-w-full gap-3 box-border",
    "grid-cols-1",
    "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
  ].join(" "),

  fieldWrapper: "min-w-0 w-full max-w-full space-y-1.5 box-border",

  fieldInput: "date-search-input box-border block min-w-0 w-full max-w-full",

  actionRow: [
    "flex w-full min-w-0 max-w-full flex-wrap gap-2 box-border",
    "lg:w-auto lg:max-w-none lg:justify-end",
  ].join(" "),

  nav: "flex w-full min-w-0 max-w-full flex-wrap gap-2 box-border",

  actionButton: [
    "inline-flex min-h-[44px] min-w-0 w-full max-w-full items-center justify-center",
    "rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold",
    "text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red",
    "lg:w-auto lg:max-w-none lg:shrink-0",
  ].join(" "),

  navButton: [
    "inline-flex min-h-[44px] min-w-0 max-w-full flex-1 basis-[calc(50%-0.25rem)]",
    "items-center justify-center rounded-md border border-dojo-border bg-dojo-black",
    "px-3 text-xs font-semibold text-dojo-muted transition",
    "hover:border-dojo-red/50 hover:text-dojo-white",
    "sm:basis-auto sm:flex-none sm:px-4 sm:text-sm lg:shrink-0",
  ].join(" "),
} as const;
