export const PIXEL_TRACKING_RECENT_EVENT_MS = 7 * 24 * 60 * 60 * 1000;

export const META_PIXEL_TRACKING_EVENT_TYPES = ["PageView", "Lead"] as const;
export const GOOGLE_PIXEL_TRACKING_EVENT_TYPES = [
  "page_view",
  "generate_lead",
  "conversion",
] as const;

export type MetaPixelTrackingEventType =
  (typeof META_PIXEL_TRACKING_EVENT_TYPES)[number];
export type GooglePixelTrackingEventType =
  (typeof GOOGLE_PIXEL_TRACKING_EVENT_TYPES)[number];
export type PixelTrackingProvider = "meta" | "google";

export type PixelTrackingHealth =
  | "active"
  | "installed_no_recent"
  | "not_configured"
  | "unknown";

export interface PixelTrackingLastEvent {
  eventType: string | null;
  receivedAt: string | null;
}

export interface MetaPixelTrackingStatusView {
  health: PixelTrackingHealth;
  indicator: string;
  label: string;
  lastEvent: PixelTrackingLastEvent;
}

export interface GooglePixelTrackingStatusView {
  health: PixelTrackingHealth;
  indicator: string;
  label: string;
  googleTagId: string | null;
  lastEvent: PixelTrackingLastEvent;
}

export interface AcademyPixelTrackingStatusSummary {
  meta: MetaPixelTrackingStatusView;
  google: GooglePixelTrackingStatusView;
  statusAvailable: boolean;
}

export const PIXEL_TRACKING_SETUP_GUIDE = {
  metaPixelId: {
    title: "How to find your Meta Pixel ID",
    steps: [
      "Open Meta Events Manager (business.facebook.com/events_manager).",
      "Select Data Sources in the left menu, then choose your Pixel.",
      "Copy the numeric Pixel ID shown at the top of the pixel overview.",
      "Paste it into the Meta Pixel ID field above and save.",
    ],
  },
  googleTagId: {
    title: "How to find your Google Tag ID",
    steps: [
      "In Google Analytics 4, go to Admin → Data streams and open your web stream.",
      "Copy the Measurement ID (format G-XXXXXXXX).",
      "For Google Ads conversions, use the conversion tag ID (format AW-XXXXXXXX) from Tools → Conversions.",
      "Paste the ID into the Google tag ID field above and save.",
    ],
  },
  metaVerification: {
    title: "How to verify Meta using Pixel Helper",
    steps: [
      "Install the Meta Pixel Helper extension in Chrome.",
      "Open a public academy page (or use Test Tracking below) in the same browser.",
      "Click the Pixel Helper icon — you should see your Pixel ID and a PageView event.",
      "Submit a test trial enquiry and confirm a single Lead event appears.",
    ],
  },
  googleVerification: {
    title: "How to verify Google using Tag Assistant",
    steps: [
      "Install Google Tag Assistant (Legacy or Companion) in Chrome.",
      "Open a public academy page (or use Test Tracking below).",
      "Confirm your Google tag ID loads and records a page view.",
      "Submit a test trial enquiry and check for generate_lead or conversion events.",
    ],
  },
} as const;

const HEALTH_PRESENTATION: Record<
  PixelTrackingHealth,
  { indicator: string; metaLabel: string; googleLabel: string }
> = {
  active: {
    indicator: "🟢",
    metaLabel: "Active and receiving events",
    googleLabel: "Active",
  },
  installed_no_recent: {
    indicator: "🟡",
    metaLabel: "Installed but no recent events",
    googleLabel: "Installed but no recent activity",
  },
  not_configured: {
    indicator: "🔴",
    metaLabel: "Not configured",
    googleLabel: "Not configured",
  },
  unknown: {
    indicator: "⚪",
    metaLabel: "Unknown",
    googleLabel: "Unknown",
  },
};

export function clubPixelTrackingEventApiPath(clubSlug: string) {
  const normalized = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  return `/api/${normalized}/pixel-tracking/event`;
}

export function isMetaPixelTrackingEventType(
  value: string,
): value is MetaPixelTrackingEventType {
  return (META_PIXEL_TRACKING_EVENT_TYPES as readonly string[]).includes(value);
}

export function isGooglePixelTrackingEventType(
  value: string,
): value is GooglePixelTrackingEventType {
  return (GOOGLE_PIXEL_TRACKING_EVENT_TYPES as readonly string[]).includes(
    value,
  );
}

export function formatPixelTrackingEventType(eventType: string | null) {
  if (!eventType) {
    return null;
  }

  switch (eventType) {
    case "page_view":
      return "Page view";
    case "generate_lead":
      return "Lead";
    case "conversion":
      return "Conversion";
    default:
      return eventType;
  }
}

function resolveTrackingHealth(input: {
  configured: boolean;
  lastEventAt: string | null;
  nowMs?: number;
}): PixelTrackingHealth {
  if (!input.configured) {
    return "not_configured";
  }

  if (!input.lastEventAt) {
    return "installed_no_recent";
  }

  const receivedAtMs = Date.parse(input.lastEventAt);

  if (Number.isNaN(receivedAtMs)) {
    return "installed_no_recent";
  }

  const nowMs = input.nowMs ?? Date.now();

  if (nowMs - receivedAtMs <= PIXEL_TRACKING_RECENT_EVENT_MS) {
    return "active";
  }

  return "installed_no_recent";
}

export function buildMetaPixelTrackingStatus(input: {
  enabled: boolean;
  pixelId: string | null;
  lastEventType: string | null;
  lastEventAt: string | null;
  statusAvailable?: boolean;
  nowMs?: number;
}): MetaPixelTrackingStatusView {
  if (input.statusAvailable === false) {
    const presentation = HEALTH_PRESENTATION.unknown;

    return {
      health: "unknown",
      indicator: presentation.indicator,
      label: presentation.metaLabel,
      lastEvent: {
        eventType: null,
        receivedAt: null,
      },
    };
  }

  const configured = input.enabled && Boolean(input.pixelId?.trim());
  const health = resolveTrackingHealth({
    configured,
    lastEventAt: input.lastEventAt,
    nowMs: input.nowMs,
  });
  const presentation = HEALTH_PRESENTATION[health];

  return {
    health,
    indicator: presentation.indicator,
    label: presentation.metaLabel,
    lastEvent: {
      eventType: input.lastEventType,
      receivedAt: input.lastEventAt,
    },
  };
}

export function buildGooglePixelTrackingStatus(input: {
  enabled: boolean;
  googleTagId: string | null;
  lastEventType: string | null;
  lastEventAt: string | null;
  statusAvailable?: boolean;
  nowMs?: number;
}): GooglePixelTrackingStatusView {
  if (input.statusAvailable === false) {
    const presentation = HEALTH_PRESENTATION.unknown;

    return {
      health: "unknown",
      indicator: presentation.indicator,
      label: presentation.googleLabel,
      googleTagId: input.googleTagId,
      lastEvent: {
        eventType: null,
        receivedAt: null,
      },
    };
  }

  const configured = input.enabled && Boolean(input.googleTagId?.trim());
  const health = resolveTrackingHealth({
    configured,
    lastEventAt: input.lastEventAt,
    nowMs: input.nowMs,
  });
  const presentation = HEALTH_PRESENTATION[health];

  return {
    health,
    indicator: presentation.indicator,
    label: presentation.googleLabel,
    googleTagId: input.googleTagId,
    lastEvent: {
      eventType: input.lastEventType,
      receivedAt: input.lastEventAt,
    },
  };
}

export function buildAcademyPixelTrackingStatusSummary(input: {
  metaPixelEnabled: boolean;
  metaPixelId: string | null;
  metaPixelLastEventType: string | null;
  metaPixelLastEventAt: string | null;
  googleTrackingEnabled: boolean;
  googleTagId: string | null;
  googleLastEventType: string | null;
  googleLastEventAt: string | null;
  statusAvailable?: boolean;
  nowMs?: number;
}): AcademyPixelTrackingStatusSummary {
  const statusAvailable = input.statusAvailable ?? true;

  return {
    statusAvailable,
    meta: buildMetaPixelTrackingStatus({
      enabled: input.metaPixelEnabled,
      pixelId: input.metaPixelId,
      lastEventType: input.metaPixelLastEventType,
      lastEventAt: input.metaPixelLastEventAt,
      statusAvailable,
      nowMs: input.nowMs,
    }),
    google: buildGooglePixelTrackingStatus({
      enabled: input.googleTrackingEnabled,
      googleTagId: input.googleTagId,
      lastEventType: input.googleLastEventType,
      lastEventAt: input.googleLastEventAt,
      statusAvailable,
      nowMs: input.nowMs,
    }),
  };
}
