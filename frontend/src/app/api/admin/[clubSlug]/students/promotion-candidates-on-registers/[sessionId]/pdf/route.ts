import { NextResponse } from "next/server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  applyKidsPromotionRegisterSessionFilter,
  isKidsPromotionCandidatesOnRegistersClub,
  parseKidsPromotionRegistersFilter,
} from "@/lib/admin-kids-promotion-registers.shared";
import { loadKidsPromotionRegisterSessionById } from "@/lib/admin-kids-promotion-registers.server";
import {
  buildKidsPromotionRegisterSessionPdfBytes,
  buildKidsPromotionRegisterSessionPdfFilename,
} from "@/lib/kids-promotion-registers-pdf.server";

export const dynamic = "force-dynamic";

interface KidsPromotionRegisterSessionPdfRouteProps {
  params: { clubSlug: string; sessionId: string };
}

export async function GET(
  request: Request,
  { params }: KidsPromotionRegisterSessionPdfRouteProps,
) {
  if (!isKidsPromotionCandidatesOnRegistersClub(params.clubSlug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const { club } = await requireAdminAccessForClubSlug(params.clubSlug);
    const { searchParams } = new URL(request.url);
    const filter = parseKidsPromotionRegistersFilter(
      searchParams.get("filter") ?? undefined,
    );
    const session = await loadKidsPromotionRegisterSessionById(
      club.id,
      club.slug,
      club.name,
      params.sessionId,
    );

    if (!session) {
      return NextResponse.json({ error: "Class session not found." }, { status: 404 });
    }

    const filteredSession = applyKidsPromotionRegisterSessionFilter(session, filter);
    const generatedAt = new Date().toISOString();
    const pdfBytes = await buildKidsPromotionRegisterSessionPdfBytes({
      academyName: club.name,
      generatedAt,
      candidatesOnly: filter === "candidates",
      session: filteredSession,
    });
    const filename = buildKidsPromotionRegisterSessionPdfFilename({
      clubSlug: club.slug,
      session: filteredSession,
      candidatesOnly: filter === "candidates",
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate promotion register PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
