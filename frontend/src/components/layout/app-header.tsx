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
    <header className="sticky top-0 z-20 -mx-4 border-b border-dojo-border bg-dojo-black/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
      <p className="text-3xl font-bold uppercase leading-none tracking-tight text-dojo-red sm:text-4xl">
        {PRODUCT_NAME}
      </p>
      <p className="mt-2 text-lg font-semibold leading-tight text-dojo-white sm:text-xl">
        {clubName}
      </p>
      <p className="mt-1 text-lg font-semibold leading-tight text-dojo-white sm:text-xl">
        {pageTitle}
      </p>
    </header>
  );
}
