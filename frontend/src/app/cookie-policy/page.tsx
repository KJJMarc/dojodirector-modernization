import type { Metadata } from "next";
import { PublicLegalDocument } from "@/components/public/public-legal-document";
import { CookiePolicyContent } from "@/components/public/cookie-policy-content";

export const metadata: Metadata = {
  title: "Dojo Director | Cookie Policy",
  description: "Cookie policy for Dojo Director.",
};

export default function CookiePolicyPage() {
  return (
    <PublicLegalDocument title="Cookie Policy">
      <CookiePolicyContent />
    </PublicLegalDocument>
  );
}
