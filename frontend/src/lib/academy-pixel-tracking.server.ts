import "server-only";

import {
  buildAcademyPixelTrackingStatusSummary,
  isGooglePixelTrackingEventType,
  isMetaPixelTrackingEventType,
  type AcademyPixelTrackingStatusSummary,
  type GooglePixelTrackingEventType,
  type MetaPixelTrackingEventType,
  type PixelTrackingProvider,
} from "@/lib/academy-pixel-tracking.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface ClubPixelTrackingStatusRow {
  meta_pixel_enabled: boolean | null;
  meta_pixel_id: string | null;
  meta_pixel_last_event_type: string | null;
  meta_pixel_last_event_at: string | null;
  google_tracking_enabled: boolean | null;
  google_tag_id: string | null;
  google_last_event_type: string | null;
  google_last_event_at: string | null;
}

const CLUB_PIXEL_TRACKING_STATUS_COLUMNS =
  "meta_pixel_enabled, meta_pixel_id, meta_pixel_last_event_type, meta_pixel_last_event_at, google_tracking_enabled, google_tag_id, google_last_event_type, google_last_event_at";

function isMissingPixelTrackingStatusColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("meta_pixel_last_event") ||
    normalized.includes("google_last_event") ||
    normalized.includes("does not exist") ||
    normalized.includes("could not find")
  );
}

function mapTrackingStatusRow(
  row: ClubPixelTrackingStatusRow,
  statusAvailable: boolean,
): AcademyPixelTrackingStatusSummary {
  return buildAcademyPixelTrackingStatusSummary({
    metaPixelEnabled: row.meta_pixel_enabled ?? false,
    metaPixelId: row.meta_pixel_id,
    metaPixelLastEventType: row.meta_pixel_last_event_type,
    metaPixelLastEventAt: row.meta_pixel_last_event_at,
    googleTrackingEnabled: row.google_tracking_enabled ?? false,
    googleTagId: row.google_tag_id,
    googleLastEventType: row.google_last_event_type,
    googleLastEventAt: row.google_last_event_at,
    statusAvailable,
  });
}

function unknownTrackingStatusSummary(): AcademyPixelTrackingStatusSummary {
  return buildAcademyPixelTrackingStatusSummary({
    metaPixelEnabled: false,
    metaPixelId: null,
    metaPixelLastEventType: null,
    metaPixelLastEventAt: null,
    googleTrackingEnabled: false,
    googleTagId: null,
    googleLastEventType: null,
    googleLastEventAt: null,
    statusAvailable: false,
  });
}

export async function loadAcademyPixelTrackingStatus(
  clubSlug: string,
): Promise<AcademyPixelTrackingStatusSummary> {
  try {
    const club = await requireClubBySlug(clubSlug);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clubs")
      .select(CLUB_PIXEL_TRACKING_STATUS_COLUMNS)
      .eq("id", club.id)
      .maybeSingle();

    if (error) {
      if (isMissingPixelTrackingStatusColumnError(error.message)) {
        return unknownTrackingStatusSummary();
      }

      console.error("[pixel-tracking] failed to load status", {
        clubSlug,
        message: error.message,
      });
      return unknownTrackingStatusSummary();
    }

    if (!data) {
      return unknownTrackingStatusSummary();
    }

    return mapTrackingStatusRow(data as ClubPixelTrackingStatusRow, true);
  } catch (error) {
    console.error("[pixel-tracking] unexpected status load failure", {
      clubSlug,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return unknownTrackingStatusSummary();
  }
}

export async function recordAcademyPixelTrackingEvent(input: {
  clubSlug: string;
  provider: PixelTrackingProvider;
  eventType: MetaPixelTrackingEventType | GooglePixelTrackingEventType;
}): Promise<{ recorded: boolean }> {
  const club = await getClubBySlug(input.clubSlug);

  if (!club) {
    return { recorded: false };
  }

  const receivedAt = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const updatePayload =
    input.provider === "meta"
      ? {
          meta_pixel_last_event_type: input.eventType,
          meta_pixel_last_event_at: receivedAt,
        }
      : {
          google_last_event_type: input.eventType,
          google_last_event_at: receivedAt,
        };

  const { error } = await supabase
    .from("clubs")
    .update(updatePayload)
    .eq("id", club.id);

  if (error) {
    if (isMissingPixelTrackingStatusColumnError(error.message)) {
      return { recorded: false };
    }

    console.error("[pixel-tracking] failed to record event", {
      clubSlug: input.clubSlug,
      provider: input.provider,
      eventType: input.eventType,
      message: error.message,
    });
    return { recorded: false };
  }

  return { recorded: true };
}

export function parsePixelTrackingEventPayload(body: unknown):
  | {
      provider: PixelTrackingProvider;
      eventType: MetaPixelTrackingEventType | GooglePixelTrackingEventType;
    }
  | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const provider = record.provider;
  const eventType = record.eventType;

  if (provider !== "meta" && provider !== "google") {
    return null;
  }

  if (typeof eventType !== "string") {
    return null;
  }

  if (provider === "meta" && isMetaPixelTrackingEventType(eventType)) {
    return { provider, eventType };
  }

  if (provider === "google" && isGooglePixelTrackingEventType(eventType)) {
    return { provider, eventType };
  }

  return null;
}
