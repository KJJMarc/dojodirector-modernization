import "server-only";

import { getAcademyEmailSettingsByClubId } from "@/lib/academy-email.server";
import type { AcademyEmailSettings } from "@/lib/academy-email.shared";
import { resolveAcademyNotificationRecipients } from "@/lib/academy-email.shared";
import { sendEmailForAcademy } from "@/lib/email.server";
import {
  buildLeadAcademyNotificationHtml,
  buildLeadAcademyNotificationText,
  buildLeadAcknowledgementHtml,
  buildLeadAcknowledgementText,
  leadAcademyNotificationSubject,
  leadAcknowledgementSubject,
  type LeadEmailContent,
} from "@/lib/leads-email.shared";
import {
  formatLeadExperienceLevelLabel,
  formatLeadProgrammeInterestLabel,
  type TrialAudience,
} from "@/lib/leads.shared";

export interface LeadEmailDispatchInput {
  academyId: string;
  leadId: string;
  fullName: string;
  email: string;
  phone: string | null;
  programmeInterest: string;
  experienceLevel: string;
  notes: string | null;
  createdAtIso: string;
  trialAudience?: TrialAudience;
}

function formatCreatedAtLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function logLeadEmailInfo(input: {
  leadId: string;
  clubSlug?: string;
  academyId?: string;
  kind: string;
  message: string;
  recipients?: string[];
}) {
  console.info("[leads-email]", {
    leadId: input.leadId,
    clubSlug: input.clubSlug,
    academyId: input.academyId,
    kind: input.kind,
    message: input.message,
    recipients: input.recipients,
  });
}

function logLeadEmailFailure(input: {
  leadId: string;
  clubSlug?: string;
  academyId?: string;
  kind: string;
  message: string;
}) {
  console.error("[leads-email]", {
    leadId: input.leadId,
    clubSlug: input.clubSlug,
    academyId: input.academyId,
    kind: input.kind,
    message: input.message,
  });
}

function buildEmailContent(
  input: LeadEmailDispatchInput,
  academy: AcademyEmailSettings,
): LeadEmailContent {
  return {
    leadName: input.fullName,
    leadEmail: input.email,
    leadPhone: input.phone,
    programmeInterestLabel: formatLeadProgrammeInterestLabel(input.programmeInterest),
    experienceLevelLabel: formatLeadExperienceLevelLabel(input.experienceLevel),
    notes: input.notes,
    academyName: academy.clubName,
    createdAtLabel: formatCreatedAtLabel(input.createdAtIso),
  };
}

async function sendLeadAcknowledgementEmail(
  clubSlug: string,
  leadId: string,
  academy: AcademyEmailSettings,
  content: LeadEmailContent,
) {
  try {
    await sendEmailForAcademy({
      clubSlug,
      to: content.leadEmail,
      subject: leadAcknowledgementSubject(content.academyName),
      html: buildLeadAcknowledgementHtml(content),
      text: buildLeadAcknowledgementText(content),
    });

    logLeadEmailInfo({
      leadId,
      clubSlug,
      kind: "lead",
      message: "Lead acknowledgement email sent.",
      recipients: [content.leadEmail],
    });
  } catch (error) {
    logLeadEmailFailure({
      leadId,
      clubSlug,
      kind: "lead",
      message: error instanceof Error ? error.message : "Lead acknowledgement email failed.",
    });
  }
}

async function sendAcademyNotificationEmail(
  clubSlug: string,
  leadId: string,
  academy: AcademyEmailSettings,
  content: LeadEmailContent,
  trialAudience?: TrialAudience,
) {
  const recipients = resolveAcademyNotificationRecipients(academy);

  if (recipients.length === 0) {
    logLeadEmailFailure({
      leadId,
      clubSlug,
      kind: "academy",
      message: "Academy contact email is not configured.",
    });
    return;
  }

  try {
    await sendEmailForAcademy({
      clubSlug,
      to: recipients,
      subject: leadAcademyNotificationSubject(content.leadName, trialAudience ?? null),
      html: buildLeadAcademyNotificationHtml(content),
      text: buildLeadAcademyNotificationText(content),
    });

    logLeadEmailInfo({
      leadId,
      clubSlug,
      kind: "academy",
      message: "Academy notification email sent.",
      recipients,
    });
  } catch (error) {
    logLeadEmailFailure({
      leadId,
      clubSlug,
      kind: "academy",
      message: error instanceof Error ? error.message : "Academy notification email failed.",
    });
  }
}

/**
 * Sends lead emails after a successful lead insert.
 * Reuses the same academy email helper as guest booking (`sendEmailForAcademy`).
 * Never throws — lead submission success must not depend on email delivery.
 */
export async function sendLeadEmailsAfterSubmission(
  input: LeadEmailDispatchInput,
): Promise<void> {
  try {
    const academy = await getAcademyEmailSettingsByClubId(input.academyId);

    if (!academy) {
      logLeadEmailFailure({
        leadId: input.leadId,
        academyId: input.academyId,
        kind: "dispatch",
        message: "Academy email settings are not configured.",
      });
      return;
    }

    if (!academy.emailEnabled) {
      logLeadEmailInfo({
        leadId: input.leadId,
        academyId: input.academyId,
        clubSlug: academy.clubSlug,
        kind: "dispatch",
        message: "Academy email is disabled; skipping lead emails.",
      });
      return;
    }

    const content = buildEmailContent(input, academy);

    await Promise.all([
      sendLeadAcknowledgementEmail(academy.clubSlug, input.leadId, academy, content),
      sendAcademyNotificationEmail(
        academy.clubSlug,
        input.leadId,
        academy,
        content,
        input.trialAudience,
      ),
    ]);

    logLeadEmailInfo({
      leadId: input.leadId,
      academyId: input.academyId,
      clubSlug: academy.clubSlug,
      kind: "dispatch",
      message: "Lead email dispatch finished.",
    });
  } catch (error) {
    logLeadEmailFailure({
      leadId: input.leadId,
      academyId: input.academyId,
      kind: "dispatch",
      message: error instanceof Error ? error.message : "Lead email dispatch failed.",
    });
  }
}
