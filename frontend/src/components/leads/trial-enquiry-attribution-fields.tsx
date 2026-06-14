"use client";

import { useMemo } from "react";
import {
  leadAttributionFieldNames,
  readLeadAttributionForClub,
} from "@/lib/lead-attribution.client";
import { formatLeadAttributionFieldLabel } from "@/lib/lead-attribution.shared";

interface TrialEnquiryAttributionFieldsProps {
  clubSlug: string;
}

export function TrialEnquiryAttributionFields({
  clubSlug,
}: TrialEnquiryAttributionFieldsProps) {
  const attribution = useMemo(() => readLeadAttributionForClub(clubSlug), [clubSlug]);

  return (
    <>
      {leadAttributionFieldNames().map((field) => (
        <input
          key={field}
          type="hidden"
          name={field}
          value={attribution[field] ?? ""}
          aria-hidden="true"
          data-attribution-label={formatLeadAttributionFieldLabel(field)}
        />
      ))}
    </>
  );
}
