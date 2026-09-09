import { NextResponse } from "next/server";
import { getClubBySlug } from "@/lib/clubs.server";
import {
  buildPublicTimetableApiResponse,
  publicTimetableApiHeaders,
} from "@/lib/public-timetable-api.shared";
import { loadPublicTimetableVenuesForClub } from "@/lib/public-timetable.server";

export const revalidate = 300;

interface PublicTimetableRouteContext {
  params: { clubSlug: string };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: publicTimetableApiHeaders("error") },
  );
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...publicTimetableApiHeaders("ok"),
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: PublicTimetableRouteContext,
) {
  try {
    const club = await getClubBySlug(params.clubSlug);

    if (!club) {
      return errorResponse("Club not found.", 404);
    }

    const venues = await loadPublicTimetableVenuesForClub(club.id);
    const payload = buildPublicTimetableApiResponse({
      club: { slug: club.slug, name: club.name },
      venues,
    });

    return NextResponse.json(payload, {
      headers: publicTimetableApiHeaders("ok"),
    });
  } catch (error) {
    console.error("[public-timetable] api failed", {
      clubSlug: params.clubSlug,
      message: error instanceof Error ? error.message : "unknown error",
    });

    return errorResponse("Unable to load timetable.", 500);
  }
}
