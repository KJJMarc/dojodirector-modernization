import { NextResponse } from "next/server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { filterPromotionCandidates } from "@/lib/admin-belt-promotion.shared";
import { loadPromotionCandidates } from "@/lib/admin-belt-promotion.server";
import { buildPromotionCandidatesPdfBytes } from "@/lib/promotion-candidates-pdf.server";
import { PROMOTION_CANDIDATES_REPORT_TITLE } from "@/lib/promotion-candidates-pdf.shared";

export const dynamic = "force-dynamic";

interface PromotionCandidatesPdfRouteProps {
  params: { clubSlug: string };
}

function buildPdfFilename(clubSlug: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  return `promotion-candidates-${clubSlug}-${dateKey}.pdf`;
}

export async function GET(
  request: Request,
  { params }: PromotionCandidatesPdfRouteProps,
) {
  try {
    const { club } = await requireAdminAccessForClubSlug(params.clubSlug);
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q")?.trim() || undefined;
    const allCandidates = await loadPromotionCandidates(club.id);
    const candidates = filterPromotionCandidates(allCandidates, searchQuery);
    const generatedAt = new Date().toISOString();
    const pdfBytes = await buildPromotionCandidatesPdfBytes({
      pageTitle: PROMOTION_CANDIDATES_REPORT_TITLE,
      academyName: club.name,
      generatedAt,
      searchQuery,
      candidates,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildPdfFilename(club.slug)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate promotion candidates PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
