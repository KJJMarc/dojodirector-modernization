import { ACTIVE_CLUB_NAME, PRODUCT_NAME } from "@/lib/branding";

interface AppHeaderProps {
  pageTitle: string;
  clubName?: string;
}

export function AppHeader({
  pageTitle,
  clubName = ACTIVE_CLUB_NAME,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-dojo-border bg-dojo-black/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dojo-white">
        {PRODUCT_NAME}
      </p>
      <p className="mt-0.5 text-sm font-medium text-dojo-muted">{clubName}</p>
      <h1 className="mt-1 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {pageTitle}
      </h1>
    </header>
  );
}
