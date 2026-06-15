import type { Metadata } from "next";
import { PublicLegalDocument } from "@/components/public/public-legal-document";
import { TermsAndConditionsContent } from "@/components/public/terms-and-conditions-content";

export const metadata: Metadata = {
  title: "Dojo Director | Terms & Conditions",
  description: "Terms and conditions for using Dojo Director.",
};

export default function TermsPage() {
  return (
    <PublicLegalDocument title="Terms & Conditions">
      <TermsAndConditionsContent />
    </PublicLegalDocument>
  );
}
