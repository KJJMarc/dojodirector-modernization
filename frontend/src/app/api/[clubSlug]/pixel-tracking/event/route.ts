import { NextResponse } from "next/server";
import {
  parsePixelTrackingEventPayload,
  recordAcademyPixelTrackingEvent,
} from "@/lib/academy-pixel-tracking.server";

export const dynamic = "force-dynamic";

interface PixelTrackingEventRouteContext {
  params: { clubSlug: string };
}

export async function POST(
  request: Request,
  { params }: PixelTrackingEventRouteContext,
) {
  try {
    const body = await request.json();
    const payload = parsePixelTrackingEventPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "Invalid tracking event payload." }, { status: 400 });
    }

    const result = await recordAcademyPixelTrackingEvent({
      clubSlug: params.clubSlug,
      provider: payload.provider,
      eventType: payload.eventType,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[pixel-tracking] api failed", {
      clubSlug: params.clubSlug,
      message: error instanceof Error ? error.message : "unknown error",
    });

    return NextResponse.json({ recorded: false });
  }
}
