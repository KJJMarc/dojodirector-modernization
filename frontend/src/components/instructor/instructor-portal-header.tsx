import Link from "next/link";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { instructorPortalPath } from "@/lib/instructor-portal.shared";

interface InstructorPortalHeaderProps {
  slug: string;
  instructorName: string;
  pageTitle?: string;
  showBackLink?: boolean;
}

export function InstructorPortalHeader({
  slug,
  instructorName,
  pageTitle,
  showBackLink = false,
}: InstructorPortalHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-3 border-b border-dojo-border bg-dojo-black/95 px-3 py-4 backdrop-blur sm:-mx-5 sm:px-5">
      {showBackLink ? (
        <Link
          href={instructorPortalPath(slug)}
          className="mb-3 inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Instructor dashboard
        </Link>
      ) : null}
      <DojoDirectorWordmark className="text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl" />
      <p className="mt-2 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {ACTIVE_CLUB_NAME}
      </p>
      <p className="mt-1 text-xl font-semibold leading-tight text-dojo-white sm:text-2xl">
        {instructorName}
      </p>
      {pageTitle ? (
        <p className="mt-1 text-base font-medium text-dojo-muted sm:text-lg">{pageTitle}</p>
      ) : null}
    </header>
  );
}
