import type { ReactNode } from "react";
import { PromotionCandidatesAdminNav } from "@/components/admin/promotion-candidates-admin-nav";
import { AppHeader } from "@/components/layout/app-header";

interface PromotionCandidatesPageShellProps {
  clubSlug: string;
  clubName: string;
  children: ReactNode;
}

/** Shared layout shell for Promotion Candidates across all academies. */
export function PromotionCandidatesPageShell({
  clubSlug,
  clubName,
  children,
}: PromotionCandidatesPageShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Promotion Candidates" clubName={clubName} />

      <PromotionCandidatesAdminNav clubSlug={clubSlug} />

      {children}
    </main>
  );
}
