import { ACTIVE_CLUB_NAME } from "@/lib/branding";

interface PublicAcademyPageHeaderProps {
  pageTitle: string;
  clubName?: string;
}

export function PublicAcademyPageHeader({
  pageTitle,
  clubName = ACTIVE_CLUB_NAME,
}: PublicAcademyPageHeaderProps) {
  return (
    <header className="pb-2 pt-1 text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dojo-red">
        {clubName}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {pageTitle}
      </h1>
    </header>
  );
}
