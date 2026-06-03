import { promotionCandidatesPdfDownloadPath } from "@/lib/promotion-candidates-pdf.shared";

interface PromotionCandidatesDownloadButtonProps {
  clubSlug: string;
  searchQuery?: string;
}

export function PromotionCandidatesDownloadButton({
  clubSlug,
  searchQuery,
}: PromotionCandidatesDownloadButtonProps) {
  const href = promotionCandidatesPdfDownloadPath(clubSlug, searchQuery);

  return (
    <a
      href={href}
      className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
      target="_blank"
      rel="noopener noreferrer"
    >
      Download PDF
    </a>
  );
}
