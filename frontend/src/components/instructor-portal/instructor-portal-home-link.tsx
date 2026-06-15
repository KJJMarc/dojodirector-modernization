"use client";

import { PortalBackLink } from "@/components/portal/portal-back-link";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

interface InstructorPortalHomeLinkProps {
  clubSlug?: string;
  isPortalHome?: boolean;
}

export function InstructorPortalHomeLink({
  clubSlug,
  isPortalHome = false,
}: InstructorPortalHomeLinkProps) {
  if (isPortalHome) {
    return null;
  }

  return (
    <PortalBackLink
      portalHomeHref={clubSlug ? instructorPortalClubPath(clubSlug) : undefined}
    />
  );
}
