import { NextResponse } from "next/server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { isCompetitionBracketGeneratorClub } from "@/lib/admin-competition-bracket.shared";
import {
  buildCompetitionBracketFromForm,
  parseCompetitorLines,
  sanitizeBracketFilenamePart,
} from "@/lib/competition-bracket.shared";
import { buildCompetitionBracketPdfBytes } from "@/lib/competition-bracket-pdf.server";

export const dynamic = "force-dynamic";

interface BracketPdfRequestBody {
  competitionName?: string;
  divisionName?: string;
  scheduleTime?: string;
  notes?: string;
  competitorsText?: string;
}

interface BracketPdfRouteProps {
  params: { clubSlug: string };
}

function buildPdfFilename(parts: string[]) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const base = parts.filter(Boolean).join("-") || "competition-bracket";
  return `${base}-${dateKey}.pdf`;
}

export async function POST(
  request: Request,
  { params }: BracketPdfRouteProps,
) {
  try {
    if (!isCompetitionBracketGeneratorClub(params.clubSlug)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await requireAdminAccessForClubSlug(params.clubSlug);

    const body = (await request.json()) as BracketPdfRequestBody;
    const bracket = buildCompetitionBracketFromForm({
      competitionName: body.competitionName ?? "",
      divisionName: body.divisionName ?? "",
      scheduleTime: body.scheduleTime ?? "",
      notes: body.notes ?? "",
      competitorsText: body.competitorsText ?? "",
    });

    if (parseCompetitorLines(body.competitorsText ?? "").length === 0) {
      return NextResponse.json(
        { error: "Enter at least one competitor name." },
        { status: 400 },
      );
    }

    const pdfBytes = await buildCompetitionBracketPdfBytes(bracket);
    const filename = buildPdfFilename([
      sanitizeBracketFilenamePart(body.competitionName ?? "competition"),
      sanitizeBracketFilenamePart(bracket.divisionName),
    ]);

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
        : "Unable to generate competition bracket PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
