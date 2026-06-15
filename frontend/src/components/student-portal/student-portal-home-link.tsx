"use client";

import { PortalBackLink } from "@/components/portal/portal-back-link";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

interface StudentPortalHomeLinkProps {
  clubSlug?: string;
  userId?: string;
  isPortalHome?: boolean;
}

export function StudentPortalHomeLink({
  clubSlug,
  userId,
  isPortalHome = false,
}: StudentPortalHomeLinkProps) {
  if (isPortalHome) {
    return null;
  }

  return (
    <PortalBackLink
      portalHomeHref={
        clubSlug && userId ? studentPortalPath(clubSlug, userId) : undefined
      }
    />
  );
}
