import "server-only";

import { buildSessionDisplayLabels } from "@/lib/class-session-schedule";
import { assertSessionIsBookableForClub } from "@/lib/class-session-booking-eligibility.server";
import { assertStudentCanBookClassProgramme } from "@/lib/admin-programmes.server";
import { assertActiveMembershipForBooking } from "@/lib/membership-access.server";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";
import {
  buildWaitlistOfferMessageBody,
  isActiveWaitlistOfferAt,
  isSessionPubliclyBookable,
  parseWaitlistOfferSessionIdFromBody,
  stripWaitlistOfferMarkerFromBody,
  WAITLIST_OFFER_DURATION_MS,
  WAITLIST_OFFER_MESSAGE_SUBJECT,
  WAITLIST_OFFER_UNAVAILABLE_MESSAGE,
  type SessionWaitlistBookingAvailabilityInput,
} from "@/lib/session-waitlist.shared";
import { createPortalMessageForRecipient } from "@/lib/portal-messages.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const CLASS_FULL_MESSAGE = "This class is full. Join the waitlist instead.";
const ALREADY_BOOKED_MESSAGE = "You are already booked onto this class.";
const ALREADY_WAITLISTED_MESSAGE = "You are already on the waitlist for this class.";
const NOT_ON_WAITLIST_MESSAGE = "You are not on the waitlist for this class.";
const NO_ACTIVE_OFFER_MESSAGE = WAITLIST_OFFER_UNAVAILABLE_MESSAGE;

export type AcceptSessionWaitlistOfferOutcome = "confirmed" | "already_confirmed";

export interface AcceptSessionWaitlistOfferResult {
  className: string;
  outcome: AcceptSessionWaitlistOfferOutcome;
}
const OFFER_EXPIRED_MESSAGE = "This waitlist offer has expired.";

interface ClassSessionRow {
  id: string;
  class_id: string;
  club_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
}

interface SessionWaitlistRow {
  id: string;
  session_id: string;
  user_id: string;
  club_id: string;
  status: string;
  joined_at: string;
  offered_at: string | null;
  expires_at: string | null;
}

interface SessionAttendeeRow {
  id: string;
  booking_status: string | null;
}

export interface SessionWaitlistSessionContext {
  sessionId: string;
  clubId: string;
  classId: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  dateLabel: string;
  timeLabel: string;
}

export type SessionWaitlistDisplayStatus = "waiting" | "offered" | null;

export interface SessionWaitlistDisplayInfo {
  waitlistStatus: SessionWaitlistDisplayStatus;
  waitlistPosition: number | null;
  waitlistCount: number;
  offerExpiresAt: string | null;
}

export interface SessionWaitlistBookingAvailability {
  hasActiveWaitlistOffer: boolean;
  waitingQueueCount: number;
}

function buildBookingAvailabilityInput(
  capacity: number | null,
  bookedCount: number,
  availability: SessionWaitlistBookingAvailability,
): SessionWaitlistBookingAvailabilityInput {
  return {
    capacity,
    bookedCount,
    hasActiveWaitlistOffer: availability.hasActiveWaitlistOffer,
    waitingQueueCount: availability.waitingQueueCount,
  };
}

async function getClassSession(sessionId: string): Promise<ClassSessionRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as ClassSessionRow;
}

async function getClassName(classId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class details: ${error.message}`);
  }

  return data?.name?.trim() || "Unnamed class";
}

async function getBookedCount(sessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", sessionId)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to count bookings: ${error.message}`);
  }

  return count ?? 0;
}

function sessionHasOpenSpace(capacity: number | null, bookedCount: number) {
  if (capacity === null) {
    return true;
  }

  return bookedCount < capacity;
}

async function getExistingMemberBooking(sessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status")
    .eq("class_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load booking: ${error.message}`);
  }

  return data as SessionAttendeeRow | null;
}

async function getActiveQueueEntryForUser(sessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, session_id, user_id, club_id, status, joined_at, offered_at, expires_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .in("status", ["waiting", "offered"])
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load waitlist entry: ${error.message}`);
  }

  return data as SessionWaitlistRow | null;
}

async function getActiveOfferForSession(sessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, session_id, user_id, club_id, status, joined_at, offered_at, expires_at")
    .eq("session_id", sessionId)
    .eq("status", "offered")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load active waitlist offer: ${error.message}`);
  }

  return data as SessionWaitlistRow | null;
}

function buildSessionContext(
  session: ClassSessionRow,
  className: string,
): SessionWaitlistSessionContext {
  const { dateLabel, timeLabel } = buildSessionDisplayLabels({
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    externalId: session.external_id,
  });

  return {
    sessionId: session.id,
    clubId: session.club_id,
    classId: session.class_id,
    className,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    dateLabel,
    timeLabel,
  };
}

function addOfferDurationMs(iso: string) {
  return new Date(new Date(iso).getTime() + WAITLIST_OFFER_DURATION_MS).toISOString();
}

async function assertStudentCanUseSessionWaitlist(input: {
  userId: string;
  sessionId: string;
  clubId: string;
  classSession: ClassSessionRow;
}) {
  await assertSessionIsBookableForClub(input.sessionId, input.clubId);

  const membershipAccess = await assertActiveMembershipForBooking(
    input.userId,
    input.clubId,
  );

  if (!membershipAccess.allowed) {
    throw new Error(membershipAccess.message);
  }

  await assertStudentCanBookClassProgramme({
    userId: input.userId,
    clubId: input.clubId,
    classId: input.classSession.class_id,
  });
}

async function bookUserOntoSession(input: {
  sessionId: string;
  userId: string;
  existingBooking: SessionAttendeeRow | null;
  source: string;
}) {
  const supabase = getSupabaseAdminClient();
  const bookedAt = new Date().toISOString();

  if (input.existingBooking) {
    const { error } = await supabase
      .from("session_attendees")
      .update({
        booking_status: "booked",
        attendance_status: "not_marked",
        source: input.source,
        booked_at: bookedAt,
        updated_at: bookedAt,
      })
      .eq("id", input.existingBooking.id)
      .eq("user_id", input.userId);

    if (error) {
      throw new Error(`Unable to complete booking: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase.from("session_attendees").insert({
    class_session_id: input.sessionId,
    user_id: input.userId,
    booking_status: "booked",
    attendance_status: "not_marked",
    source: input.source,
    booked_at: bookedAt,
  });

  if (error) {
    throw new Error(`Unable to complete booking: ${error.message}`);
  }
}

async function expireOfferRow(offerId: string) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("session_waitlist")
    .update({ status: "expired" })
    .eq("id", offerId)
    .eq("status", "offered");

  if (error) {
    throw new Error(`Unable to expire waitlist offer: ${error.message}`);
  }
}

async function loadExpiredOffersForSession(sessionId: string) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "offered")
    .lt("expires_at", now);

  if (error) {
    throw new Error(`Unable to load expired offers: ${error.message}`);
  }

  return (data ?? []) as Array<{ id: string }>;
}

async function loadWaitingQueue(sessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("id, session_id, user_id, club_id, status, joined_at")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load waitlist queue: ${error.message}`);
  }

  return (data ?? []) as SessionWaitlistRow[];
}

export async function processExpiredWaitlistOffersForSession(
  sessionId: string,
  options?: { offerFromCancellationId?: string | null },
): Promise<{ expiredCount: number; offeredUserId: string | null }> {
  const expiredOffers = await loadExpiredOffersForSession(sessionId);

  for (const offer of expiredOffers) {
    await expireOfferRow(offer.id);
  }

  const offerResult = await tryCreateNextWaitlistOfferForSession({
    sessionId,
    offerFromCancellationId: options?.offerFromCancellationId ?? null,
  });

  return {
    expiredCount: expiredOffers.length,
    offeredUserId: offerResult.offeredUserId,
  };
}

export async function processExpiredWaitlistOffersForSessions(sessionIds: string[]) {
  const offeredUserIds: string[] = [];

  for (const sessionId of sessionIds) {
    const result = await processExpiredWaitlistOffersForSession(sessionId);

    if (result.offeredUserId) {
      offeredUserIds.push(result.offeredUserId);
    }
  }

  return offeredUserIds;
}

async function tryCreateNextWaitlistOfferForSession(input: {
  sessionId: string;
  offerFromCancellationId: string | null;
}): Promise<{ offeredUserId: string | null; clubId: string | null }> {
  const classSession = await getClassSession(input.sessionId);
  const bookedCount = await getBookedCount(input.sessionId);

  if (!sessionHasOpenSpace(classSession.capacity, bookedCount)) {
    return { offeredUserId: null, clubId: null };
  }

  const activeOffer = await getActiveOfferForSession(input.sessionId);

  if (activeOffer) {
    const now = new Date().toISOString();
    if (activeOffer.expires_at && activeOffer.expires_at > now) {
      return { offeredUserId: null, clubId: null };
    }

    await expireOfferRow(activeOffer.id);
  }

  const queue = await loadWaitingQueue(input.sessionId);

  if (queue.length === 0) {
    return { offeredUserId: null, clubId: null };
  }

  const className = await getClassName(classSession.class_id);
  const sessionContext = buildSessionContext(classSession, className);
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const expiresAt = addOfferDurationMs(now);

  for (const waitlistEntry of queue) {
    const existingBooking = await getExistingMemberBooking(
      input.sessionId,
      waitlistEntry.user_id,
    );

    if (existingBooking?.booking_status === "booked") {
      await supabase
        .from("session_waitlist")
        .update({
          status: "cancelled",
          cancelled_at: now,
        })
        .eq("id", waitlistEntry.id)
        .eq("status", "waiting");
      continue;
    }

    const freshBookedCount = await getBookedCount(input.sessionId);
    if (!sessionHasOpenSpace(classSession.capacity, freshBookedCount)) {
      return { offeredUserId: null, clubId: null };
    }

    const { data: promotedRows, error: offerError } = await supabase
      .from("session_waitlist")
      .update({
        status: "offered",
        offered_at: now,
        expires_at: expiresAt,
        promoted_from_cancellation_id: input.offerFromCancellationId,
      })
      .eq("id", waitlistEntry.id)
      .eq("status", "waiting")
      .select("id, user_id");

    if (offerError) {
      throw new Error(`Unable to create waitlist offer: ${offerError.message}`);
    }

    if (!promotedRows?.length) {
      continue;
    }

    const activeOfferAfterUpdate = await getActiveOfferForSession(input.sessionId);

    if (!activeOfferAfterUpdate || activeOfferAfterUpdate.id !== waitlistEntry.id) {
      continue;
    }

    await createPortalMessageForRecipient({
      clubId: classSession.club_id,
      recipientUserId: waitlistEntry.user_id,
      recipientType: "student",
      subject: WAITLIST_OFFER_MESSAGE_SUBJECT,
      body: buildWaitlistOfferMessageBody({
        className: sessionContext.className,
        dateLabel: sessionContext.dateLabel,
        timeLabel: sessionContext.timeLabel,
        sessionId: input.sessionId,
      }),
      sentByAdminUserId: null,
    });

    return {
      offeredUserId: waitlistEntry.user_id,
      clubId: classSession.club_id,
    };
  }

  return { offeredUserId: null, clubId: null };
}

export async function createNextWaitlistOfferAfterCancellation(input: {
  sessionId: string;
  clubId: string;
  cancelledAttendeeId: string;
}): Promise<{ offeredUserId: string | null }> {
  const classSession = await getClassSession(input.sessionId);

  if (classSession.club_id !== input.clubId) {
    return { offeredUserId: null };
  }

  const result = await processExpiredWaitlistOffersForSession(input.sessionId, {
    offerFromCancellationId: input.cancelledAttendeeId,
  });

  return { offeredUserId: result.offeredUserId };
}

export interface SessionWaitlistLoaderOptions {
  /** When true, skip side-effect expiry processing (read-only list views). */
  skipExpiryProcessing?: boolean;
}

interface SessionWaitlistQueueEntry {
  userId: string;
  status: string;
  expiresAt: string | null;
}

function createEmptySessionWaitlistDisplayMap(sessionIds: string[]) {
  const displayBySessionId = new Map<string, SessionWaitlistDisplayInfo>();

  for (const sessionId of sessionIds) {
    displayBySessionId.set(sessionId, {
      waitlistStatus: null,
      waitlistPosition: null,
      waitlistCount: 0,
      offerExpiresAt: null,
    });
  }

  return displayBySessionId;
}

function createEmptySessionWaitlistAvailabilityMap(sessionIds: string[]) {
  const availabilityBySessionId = new Map<string, SessionWaitlistBookingAvailability>();

  for (const sessionId of sessionIds) {
    availabilityBySessionId.set(sessionId, {
      hasActiveWaitlistOffer: false,
      waitingQueueCount: 0,
    });
  }

  return availabilityBySessionId;
}

function buildSessionWaitlistDisplayMap(
  userId: string,
  sessionIds: string[],
  waitingBySessionId: Map<string, SessionWaitlistQueueEntry[]>,
  now: string,
) {
  const displayBySessionId = createEmptySessionWaitlistDisplayMap(sessionIds);

  for (const [sessionId, queue] of Array.from(waitingBySessionId.entries())) {
    const waitingOnly = queue.filter((entry) => entry.status === "waiting");
    const userEntry = queue.find((entry) => entry.userId === userId);
    const existing = displayBySessionId.get(sessionId);

    if (!existing) {
      continue;
    }

    if (!userEntry) {
      displayBySessionId.set(sessionId, {
        waitlistStatus: null,
        waitlistPosition: null,
        waitlistCount: waitingOnly.length,
        offerExpiresAt: null,
      });
      continue;
    }

    if (
      userEntry.status === "offered" &&
      isActiveWaitlistOfferAt(userEntry.status, userEntry.expiresAt, now)
    ) {
      displayBySessionId.set(sessionId, {
        waitlistStatus: "offered",
        waitlistPosition: null,
        waitlistCount: waitingOnly.length,
        offerExpiresAt: userEntry.expiresAt,
      });
      continue;
    }

    if (userEntry.status === "offered") {
      displayBySessionId.set(sessionId, {
        waitlistStatus: null,
        waitlistPosition: null,
        waitlistCount: waitingOnly.length,
        offerExpiresAt: null,
      });
      continue;
    }

    const userIndex = waitingOnly.findIndex((entry) => entry.userId === userId);

    displayBySessionId.set(sessionId, {
      waitlistStatus: "waiting",
      waitlistPosition: userIndex >= 0 ? userIndex + 1 : null,
      waitlistCount: waitingOnly.length,
      offerExpiresAt: null,
    });
  }

  return displayBySessionId;
}

function buildSessionWaitlistAvailabilityMap(
  sessionIds: string[],
  waitingBySessionId: Map<string, SessionWaitlistQueueEntry[]>,
  now: string,
) {
  const availabilityBySessionId = createEmptySessionWaitlistAvailabilityMap(sessionIds);

  for (const [sessionId, queue] of Array.from(waitingBySessionId.entries())) {
    const existing = availabilityBySessionId.get(sessionId);

    if (!existing) {
      continue;
    }

    for (const entry of queue) {
      if (entry.status === "waiting") {
        existing.waitingQueueCount += 1;
        continue;
      }

      if (
        entry.status === "offered" &&
        isActiveWaitlistOfferAt(entry.status, entry.expiresAt, now)
      ) {
        existing.hasActiveWaitlistOffer = true;
      }
    }
  }

  return availabilityBySessionId;
}

async function loadSessionWaitlistQueueBySessionId(
  sessionIds: string[],
  options?: SessionWaitlistLoaderOptions,
) {
  const waitingBySessionId = new Map<string, SessionWaitlistQueueEntry[]>();

  if (sessionIds.length === 0) {
    return {
      waitingBySessionId,
      now: new Date().toISOString(),
    };
  }

  if (!options?.skipExpiryProcessing) {
    await processExpiredWaitlistOffersForSessions(sessionIds);
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("session_id, user_id, status, joined_at, expires_at")
    .in("session_id", sessionIds)
    .in("status", ["waiting", "offered"])
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load waitlist: ${error.message}`);
  }

  for (const row of (data ?? []) as Array<{
    session_id: string;
    user_id: string;
    status: string;
    expires_at: string | null;
  }>) {
    const queue = waitingBySessionId.get(row.session_id) ?? [];
    queue.push({
      userId: row.user_id,
      status: row.status,
      expiresAt: row.expires_at,
    });
    waitingBySessionId.set(row.session_id, queue);
  }

  return { waitingBySessionId, now };
}

export async function loadSessionWaitlistDisplayAndAvailabilityBySessionId(
  userId: string,
  sessionIds: string[],
  options?: SessionWaitlistLoaderOptions,
): Promise<{
  displayBySessionId: Map<string, SessionWaitlistDisplayInfo>;
  availabilityBySessionId: Map<string, SessionWaitlistBookingAvailability>;
}> {
  const { waitingBySessionId, now } = await loadSessionWaitlistQueueBySessionId(
    sessionIds,
    options,
  );

  return {
    displayBySessionId: buildSessionWaitlistDisplayMap(
      userId,
      sessionIds,
      waitingBySessionId,
      now,
    ),
    availabilityBySessionId: buildSessionWaitlistAvailabilityMap(
      sessionIds,
      waitingBySessionId,
      now,
    ),
  };
}

export async function loadSessionWaitlistDisplayBySessionId(
  userId: string,
  sessionIds: string[],
  options?: SessionWaitlistLoaderOptions,
): Promise<Map<string, SessionWaitlistDisplayInfo>> {
  const { displayBySessionId } =
    await loadSessionWaitlistDisplayAndAvailabilityBySessionId(
      userId,
      sessionIds,
      options,
    );

  return displayBySessionId;
}

export async function loadSessionWaitlistBookingAvailabilityBySessionId(
  sessionIds: string[],
  options?: SessionWaitlistLoaderOptions,
): Promise<Map<string, SessionWaitlistBookingAvailability>> {
  const { availabilityBySessionId } =
    await loadSessionWaitlistDisplayAndAvailabilityBySessionId(
      "",
      sessionIds,
      options,
    );

  return availabilityBySessionId;
}

export async function loadActiveWaitlistOffersForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_waitlist")
    .select("session_id, expires_at")
    .eq("user_id", userId)
    .eq("status", "offered")
    .gt("expires_at", now);

  if (error) {
    throw new Error(`Failed to load active waitlist offers: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as Array<{ session_id: string; expires_at: string | null }>).map(
      (row) => [row.session_id, row.expires_at] as const,
    ),
  );
}

export async function loadMemberBookedSessionIdsForUser(
  userId: string,
  sessionIds: string[],
): Promise<Set<string>> {
  if (sessionIds.length === 0) {
    return new Set();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("class_session_id")
    .eq("user_id", userId)
    .eq("booking_status", "booked")
    .in("class_session_id", sessionIds);

  if (error) {
    throw new Error(`Failed to load member bookings: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as Array<{ class_session_id: string }>).map(
      (row) => row.class_session_id,
    ),
  );
}

export function enrichPortalMessagesWithWaitlistOffers(
  messages: PortalMessageListItem[],
  activeOffersBySessionId: Map<string, string | null>,
  bookedSessionIds: Set<string>,
): PortalMessageListItem[] {
  return messages.map((message) => {
    if (message.subject !== WAITLIST_OFFER_MESSAGE_SUBJECT) {
      return message;
    }

    const sessionId = parseWaitlistOfferSessionIdFromBody(message.body);

    if (!sessionId) {
      return {
        ...message,
        body: stripWaitlistOfferMarkerFromBody(message.body),
      };
    }

    const expiresAt = activeOffersBySessionId.get(sessionId) ?? null;
    const isBookingConfirmed = bookedSessionIds.has(sessionId);

    return {
      ...message,
      body: stripWaitlistOfferMarkerFromBody(message.body),
      waitlistOffer: {
        sessionId,
        expiresAt,
        isBookingConfirmed,
        isOfferActive: Boolean(expiresAt) && !isBookingConfirmed,
      },
    };
  });
}

export async function joinSessionWaitlistForUser(input: {
  userId: string;
  sessionId: string;
  clubId: string;
}): Promise<{ className: string }> {
  const userId = input.userId.trim();
  const sessionId = input.sessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!sessionId) {
    throw new Error("Please choose a class.");
  }

  const classSession = await getClassSession(sessionId);

  if (classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  if (classSession.status === "cancelled") {
    throw new Error("This class session is no longer available.");
  }

  const nowIso = new Date().toISOString();
  if (classSession.starts_at < nowIso) {
    throw new Error("You cannot join the waitlist for a class that has already started.");
  }

  await assertStudentCanUseSessionWaitlist({
    userId,
    sessionId,
    clubId: input.clubId,
    classSession,
  });

  const [existingBooking, existingQueueEntry, bookedCount, className, availability] =
    await Promise.all([
      getExistingMemberBooking(sessionId, userId),
      getActiveQueueEntryForUser(sessionId, userId),
      getBookedCount(sessionId),
      getClassName(classSession.class_id),
      loadSessionWaitlistBookingAvailabilityBySessionId([sessionId]).then(
        (map) =>
          map.get(sessionId) ?? {
            hasActiveWaitlistOffer: false,
            waitingQueueCount: 0,
          },
      ),
    ]);

  if (existingBooking?.booking_status === "booked") {
    throw new Error(ALREADY_BOOKED_MESSAGE);
  }

  if (existingBooking?.booking_status === "waitlisted") {
    throw new Error(ALREADY_WAITLISTED_MESSAGE);
  }

  if (existingQueueEntry) {
    throw new Error(
      existingQueueEntry.status === "offered"
        ? "You already have a waitlist offer for this class."
        : ALREADY_WAITLISTED_MESSAGE,
    );
  }

  if (
    isSessionPubliclyBookable(
      buildBookingAvailabilityInput(classSession.capacity, bookedCount, availability),
    )
  ) {
    throw new Error("This class has spaces available. Book the class instead.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("session_waitlist").insert({
    session_id: sessionId,
    user_id: userId,
    club_id: input.clubId,
    status: "waiting",
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(ALREADY_WAITLISTED_MESSAGE);
    }

    throw new Error(`Unable to join waitlist: ${error.message}`);
  }

  return { className };
}

export async function leaveSessionWaitlistForUser(input: {
  userId: string;
  sessionId: string;
  clubId: string;
}): Promise<{ className: string; offeredUserId: string | null }> {
  const userId = input.userId.trim();
  const sessionId = input.sessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!sessionId) {
    throw new Error("Please choose a class.");
  }

  const classSession = await getClassSession(sessionId);

  if (classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  const existingQueueEntry = await getActiveQueueEntryForUser(sessionId, userId);

  if (!existingQueueEntry) {
    throw new Error(NOT_ON_WAITLIST_MESSAGE);
  }

  if (existingQueueEntry.status === "offered") {
    throw new Error("Use Decline Place to turn down a waitlist offer.");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("session_waitlist")
    .update({
      status: "cancelled",
      cancelled_at: now,
    })
    .eq("id", existingQueueEntry.id)
    .eq("user_id", userId)
    .eq("status", "waiting");

  if (error) {
    throw new Error(`Unable to leave waitlist: ${error.message}`);
  }

  const className = await getClassName(classSession.class_id);
  return { className, offeredUserId: null };
}

export async function declineSessionWaitlistOfferForUser(input: {
  userId: string;
  sessionId: string;
  clubId: string;
}): Promise<{ className: string; offeredUserId: string | null }> {
  const userId = input.userId.trim();
  const sessionId = input.sessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!sessionId) {
    throw new Error("Please choose a class.");
  }

  const classSession = await getClassSession(sessionId);

  if (classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  await processExpiredWaitlistOffersForSession(sessionId);

  const offerEntry = await getActiveQueueEntryForUser(sessionId, userId);

  if (!offerEntry || offerEntry.status !== "offered") {
    throw new Error(NO_ACTIVE_OFFER_MESSAGE);
  }

  const now = new Date().toISOString();

  if (!offerEntry.expires_at || offerEntry.expires_at <= now) {
    throw new Error(OFFER_EXPIRED_MESSAGE);
  }

  await expireOfferRow(offerEntry.id);

  const nextOffer = await tryCreateNextWaitlistOfferForSession({
    sessionId,
    offerFromCancellationId: null,
  });

  const className = await getClassName(classSession.class_id);
  return { className, offeredUserId: nextOffer.offeredUserId };
}

export async function acceptSessionWaitlistOfferForUser(input: {
  userId: string;
  sessionId: string;
  clubId: string;
}): Promise<AcceptSessionWaitlistOfferResult> {
  const userId = input.userId.trim();
  const sessionId = input.sessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!sessionId) {
    throw new Error("Please choose a class.");
  }

  const classSession = await getClassSession(sessionId);

  if (classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  const className = await getClassName(classSession.class_id);
  const existingBooking = await getExistingMemberBooking(sessionId, userId);

  if (existingBooking?.booking_status === "booked") {
    return { className, outcome: "already_confirmed" };
  }

  await processExpiredWaitlistOffersForSession(sessionId);

  const offerEntry = await getActiveQueueEntryForUser(sessionId, userId);

  if (!offerEntry || offerEntry.status !== "offered") {
    if (existingBooking?.booking_status === "booked") {
      return { className, outcome: "already_confirmed" };
    }

    throw new Error(NO_ACTIVE_OFFER_MESSAGE);
  }

  const now = new Date().toISOString();
  if (!offerEntry.expires_at || offerEntry.expires_at <= now) {
    throw new Error(OFFER_EXPIRED_MESSAGE);
  }

  const bookedCount = await getBookedCount(sessionId);

  if (!sessionHasOpenSpace(classSession.capacity, bookedCount)) {
    throw new Error(CLASS_FULL_MESSAGE);
  }

  const supabase = getSupabaseAdminClient();
  const bookedAt = new Date().toISOString();

  await bookUserOntoSession({
    sessionId,
    userId,
    existingBooking,
    source: "waitlist_offer",
  });

  const { error: waitlistError } = await supabase
    .from("session_waitlist")
    .update({
      status: "booked",
      accepted_at: bookedAt,
      booked_at: bookedAt,
    })
    .eq("id", offerEntry.id)
    .eq("user_id", userId)
    .eq("status", "offered");

  if (waitlistError) {
    throw new Error(`Unable to accept waitlist offer: ${waitlistError.message}`);
  }

  return { className, outcome: "confirmed" };
}

export async function cancelActiveSessionWaitlistForUserIfPresent(
  sessionId: string,
  userId: string,
) {
  const existingQueueEntry = await getActiveQueueEntryForUser(sessionId, userId);

  if (!existingQueueEntry) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const wasOffered = existingQueueEntry.status === "offered";

  await supabase
    .from("session_waitlist")
    .update({
      status: "cancelled",
      cancelled_at: now,
    })
    .eq("id", existingQueueEntry.id)
    .in("status", ["waiting", "offered"]);

  if (wasOffered) {
    await tryCreateNextWaitlistOfferForSession({
      sessionId,
      offerFromCancellationId: null,
    });
  }
}

export async function assertClassSessionHasSpaceForBooking(
  sessionId: string,
  capacity: number | null,
  options?: SessionWaitlistLoaderOptions,
) {
  const [bookedCount, availability] = await Promise.all([
    getBookedCount(sessionId),
    loadSessionWaitlistBookingAvailabilityBySessionId([sessionId], options).then(
      (map) =>
        map.get(sessionId) ?? {
          hasActiveWaitlistOffer: false,
          waitingQueueCount: 0,
        },
    ),
  ]);

  if (
    !isSessionPubliclyBookable(
      buildBookingAvailabilityInput(capacity, bookedCount, availability),
    )
  ) {
    throw new Error(CLASS_FULL_MESSAGE);
  }
}
