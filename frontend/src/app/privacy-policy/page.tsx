import type { Metadata } from "next";
import { PublicLegalDocument } from "@/components/public/public-legal-document";
import { PrivacyPolicyContent } from "@/components/public/privacy-policy-content";

export const metadata: Metadata = {
  title: "Dojo Director | Privacy Policy",
  description: "Privacy policy for Dojo Director.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLegalDocument title="Privacy Policy">
      <PrivacyPolicyContent />
    </PublicLegalDocument>
  );
}
