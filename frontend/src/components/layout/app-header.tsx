import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";

interface AppHeaderProps {
  pageTitle: string;
  clubName?: string;
  /** When true, header padding aligns with page content (no negative horizontal margin). */
  contained?: boolean;
}

export function AppHeader({
  pageTitle,
  clubName = ACTIVE_CLUB_NAME,
  contained = false,
}: AppHeaderProps) {
  const layoutClassName = contained
    ? "px-0 py-4"
    : "-mx-4 px-4 py-4 sm:-mx-6 sm:px-6";

  return (
    <header
      className={`sticky top-0 z-20 border-b border-dojo-border bg-dojo-black/95 backdrop-blur ${layoutClassName}`}
    >
      <DojoDirectorWordmark className="text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl" />
      <p className="mt-2 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {clubName}
      </p>
      <p className="mt-1 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {pageTitle}
      </p>
    </header>
  );
}
