"use client";

import { useEffect } from "react";
import { captureLeadAttributionForClub } from "@/lib/lead-attribution.client";

interface PublicAcademyAttributionCaptureProps {
  clubSlug: string;
}

export function PublicAcademyAttributionCapture({
  clubSlug,
}: PublicAcademyAttributionCaptureProps) {
  useEffect(() => {
    captureLeadAttributionForClub(clubSlug);
  }, [clubSlug]);

  return null;
}
