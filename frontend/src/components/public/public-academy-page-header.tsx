import { ACTIVE_CLUB_NAME } from "@/lib/branding";

interface PublicAcademyPageHeaderProps {
  pageTitle: string;
  clubName?: string;
  /** When true, header sticks below the viewport top (booking / enquiry flows). */
  sticky?: boolean;
  /** Light tone for white public pages (black/grey text). */
  tone?: "dark" | "light";
}

export function PublicAcademyPageHeader({
  pageTitle,
  clubName = ACTIVE_CLUB_NAME,
  sticky = false,
  tone = "dark",
}: PublicAcademyPageHeaderProps) {
  const isLight = tone === "light";
  const layoutClassName = sticky
    ? "-mx-3 px-3 py-4 sm:-mx-5 sm:px-5"
    : "pb-2 pt-1";
  const stickyClassName = sticky
    ? isLight
      ? "sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur"
      : "sticky top-0 z-20 border-b border-dojo-border bg-dojo-black/95 backdrop-blur"
    : "";
  const clubNameClassName = isLight
    ? "text-3xl font-bold uppercase leading-none tracking-tight text-neutral-900 sm:text-4xl"
    : "text-3xl font-bold uppercase leading-none tracking-tight text-dojo-white sm:text-4xl";
  const pageTitleClassName = isLight
    ? "mt-2 text-xl font-semibold leading-tight text-neutral-500 sm:text-2xl"
    : "mt-2 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl";

  return (
    <header
      className={`${layoutClassName} text-center sm:text-left ${stickyClassName}`}
    >
      <h1 className={clubNameClassName}>{clubName}</h1>
      <p className={pageTitleClassName}>{pageTitle}</p>
    </header>
  );
}
