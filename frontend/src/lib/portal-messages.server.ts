import "server-only";

import {
  mapPortalMessageRow,
  toPortalMessageRecipientType,
  type PortalMessageListItem,
  type PortalMessageRecipientType,
} from "@/lib/portal-messages.shared";
import type { AcademyMessageRecipientType } from "@/lib/academy-messaging.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface PortalMessageRow {
  id: string;
  club_id: string;
  recipient_user_id: string;
  recipient_type: string;
  subject: string;
  body: string;
  sent_by_admin_user_id: string | null;
  sent_at: string;
  read_at: string | null;
  deleted_at: string | null;
}

const PORTAL_MESSAGE_COLUMNS =
  "id, club_id, recipient_user_id, recipient_type, subject, body, sent_by_admin_user_id, sent_at, read_at, deleted_at";

function logPortalMessage(message: string, meta?: Record<string, string | number>) {
  console.error("[portal-messages]", { message, ...meta });
}

export async function countUnreadPortalMessages(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
}): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("portal_messages")
    .select("id", { count: "exact", head: true })
    .eq("club_id", input.clubId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("recipient_type", input.recipientType)
    .is("read_at", null)
    .is("deleted_at", null);

  if (error) {
    logPortalMessage("Failed to count unread messages", { reason: error.message });
    return 0;
  }

  return count ?? 0;
}

export async function listPortalMessagesForRecipient(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
}): Promise<PortalMessageListItem[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portal_messages")
    .select("id, subject, body, sent_at, read_at")
    .eq("club_id", input.clubId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("recipient_type", input.recipientType)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load portal messages: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id: string;
    subject: string;
    body: string;
    sent_at: string;
    read_at: string | null;
  }>).map(mapPortalMessageRow);
}

export async function getPortalMessageForRecipient(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
  messageId: string;
}): Promise<PortalMessageRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portal_messages")
    .select(PORTAL_MESSAGE_COLUMNS)
    .eq("id", input.messageId)
    .eq("club_id", input.clubId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("recipient_type", input.recipientType)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load portal message: ${error.message}`);
  }

  return (data as PortalMessageRow | null) ?? null;
}

export async function markPortalMessageRead(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
  messageId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("portal_messages")
    .update({ read_at: now })
    .eq("id", input.messageId)
    .eq("club_id", input.clubId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("recipient_type", input.recipientType)
    .is("deleted_at", null)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to mark message as read: ${error.message}`);
  }
}

export async function softDeletePortalMessage(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
  messageId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("portal_messages")
    .update({ deleted_at: now })
    .eq("id", input.messageId)
    .eq("club_id", input.clubId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("recipient_type", input.recipientType)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to hide message: ${error.message}`);
  }
}

function formatPortalMessageInsertError(errorMessage: string) {
  if (
    errorMessage.includes("portal_messages") &&
    (errorMessage.includes("does not exist") ||
      errorMessage.includes("Could not find the table"))
  ) {
    return "portal_messages table is missing — run the portal_messages database migration.";
  }

  return errorMessage;
}

export async function createPortalMessageForRecipient(input: {
  clubId: string;
  recipientUserId: string;
  recipientType: PortalMessageRecipientType;
  subject: string;
  body: string;
  sentByAdminUserId: string | null;
}): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portal_messages")
    .insert({
      club_id: input.clubId,
      recipient_user_id: input.recipientUserId,
      recipient_type: input.recipientType,
      subject: input.subject.trim(),
      body: input.body.trim(),
      sent_by_admin_user_id: input.sentByAdminUserId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Failed to create portal message: ${formatPortalMessageInsertError(error.message)}`,
    );
  }

  if (!data?.id) {
    throw new Error("Failed to create portal message: insert returned no row id.");
  }

  logPortalMessage("Portal message created", {
    messageId: data.id,
    clubId: input.clubId,
    recipientUserId: input.recipientUserId,
    recipientType: input.recipientType,
  });

  return data.id;
}

export async function createPortalMessagesForRecipients(input: {
  clubId: string;
  recipientType: AcademyMessageRecipientType;
  recipients: Array<{ userId: string; fullName: string }>;
  subject: string;
  body: string;
  sentByAdminUserId: string | null;
}): Promise<{
  createdCount: number;
  failedCount: number;
  createdRecipientIds: string[];
  createdMessageIds: string[];
  failures: Array<{ fullName: string; reason: string }>;
}> {
  const portalRecipientType = toPortalMessageRecipientType(input.recipientType);
  const result = {
    createdCount: 0,
    failedCount: 0,
    createdRecipientIds: [] as string[],
    createdMessageIds: [] as string[],
    failures: [] as Array<{ fullName: string; reason: string }>,
  };

  for (const recipient of input.recipients) {
    try {
      const messageId = await createPortalMessageForRecipient({
        clubId: input.clubId,
        recipientUserId: recipient.userId,
        recipientType: portalRecipientType,
        subject: input.subject,
        body: input.body,
        sentByAdminUserId: input.sentByAdminUserId,
      });
      result.createdCount += 1;
      result.createdRecipientIds.push(recipient.userId);
      result.createdMessageIds.push(messageId);
    } catch (error) {
      result.failedCount += 1;
      result.failures.push({
        fullName: recipient.fullName,
        reason: error instanceof Error ? error.message : "Unable to create portal message.",
      });
      logPortalMessage("Create failed for recipient", {
        userId: recipient.userId,
        clubId: input.clubId,
        recipientType: portalRecipientType,
        reason: result.failures.at(-1)?.reason ?? "unknown",
      });
    }
  }

  return result;
}
