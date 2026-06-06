import { PoweredByDojoDirector } from "@/components/public/powered-by-dojo-director";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";

interface PublicAcademyPageHeaderProps {
  pageTitle: string;
  clubName?: string;
  /** When true, header sticks below the viewport top (booking / enquiry flows). */
  sticky?: boolean;
}

export function PublicAcademyPageHeader({
  pageTitle,
  clubName = ACTIVE_CLUB_NAME,
  sticky = false,
}: PublicAcademyPageHeaderProps) {
  const layoutClassName = sticky
    ? "-mx-3 px-3 py-4 sm:-mx-5 sm:px-5"
    : "pb-2 pt-1";

  return (
    <header
      className={`${layoutClassName} text-center sm:text-left ${
        sticky
          ? "sticky top-0 z-20 border-b border-dojo-border bg-dojo-black/95 backdrop-blur"
          : ""
      }`}
    >
      <h1 className="text-3xl font-bold uppercase leading-none tracking-tight text-dojo-white sm:text-4xl">
        {clubName}
      </h1>
      <p className="mt-2 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {pageTitle}
      </p>
      <PoweredByDojoDirector className="mt-2 text-xs text-dojo-muted" />
    </header>
  );
}
