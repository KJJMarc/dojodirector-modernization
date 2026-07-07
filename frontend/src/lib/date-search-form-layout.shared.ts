/** Shared responsive layout for admin/instructor date search toolbars. */
export const DATE_SEARCH_FORM_LAYOUT = {
  form: "flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end",
  fieldWrapper: "min-w-0 w-full max-w-full flex-1 space-y-1.5 box-border sm:min-w-0",
  fieldInput: "box-border min-w-0 w-full max-w-full",
  actionRow: "flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0",
  nav: "flex w-full min-w-0 flex-wrap gap-2",
} as const;
