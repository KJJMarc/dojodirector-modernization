import "server-only";

import { Resend } from "resend";
import {
  assertAcademyEmailEnabled,
  formatAcademyFromAddress,
  requireAcademyEmailSettingsBySlug,
} from "@/lib/academy-email.server";
import { requireResendEnvConfig } from "@/lib/resend-env.server";

export interface SendEmailForAcademyInput {
  clubSlug: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailForAcademyResult {
  id: string;
  from: string;
  replyTo: string;
}

let resendClient: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function normalizeRecipients(to: string | string[]): string[] {
  const values = Array.isArray(to) ? to : [to];

  return values.map((value) => value.trim()).filter(Boolean);
}

export async function sendEmailForAcademy(
  input: SendEmailForAcademyInput,
): Promise<SendEmailForAcademyResult> {
  const academy = await requireAcademyEmailSettingsBySlug(input.clubSlug);
  assertAcademyEmailEnabled(academy);

  const recipients = normalizeRecipients(input.to);

  if (recipients.length === 0) {
    throw new Error("At least one recipient email is required.");
  }

  const subject = input.subject.trim();

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  const html = input.html.trim();

  if (!html) {
    throw new Error("Email body is required.");
  }

  const resendEnv = requireResendEnvConfig();
  const from = formatAcademyFromAddress(academy, resendEnv.fromEmail);
  const replyTo = academy.replyToEmail;

  const { data, error } = await getResendClient(resendEnv.apiKey).emails.send({
    from,
    to: recipients,
    replyTo,
    subject,
    html,
    text: input.text?.trim() || undefined,
  });

  if (error) {
    throw new Error(error.message || "Resend failed to send the email.");
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message id.");
  }

  return {
    id: data.id,
    from,
    replyTo,
  };
}

/** Platform default sender (RESEND_FROM_EMAIL) when no academy context applies. */
export async function sendPlatformEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendEmailForAcademyResult> {
  const resendEnv = requireResendEnvConfig();
  const recipients = normalizeRecipients(input.to);

  if (recipients.length === 0) {
    throw new Error("At least one recipient email is required.");
  }

  const { data, error } = await getResendClient(resendEnv.apiKey).emails.send({
    from: resendEnv.fromEmail,
    to: recipients,
    replyTo: input.replyTo?.trim() || undefined,
    subject: input.subject.trim(),
    html: input.html.trim(),
    text: input.text?.trim() || undefined,
  });

  if (error) {
    throw new Error(error.message || "Resend failed to send the email.");
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message id.");
  }

  return {
    id: data.id,
    from: resendEnv.fromEmail,
    replyTo: input.replyTo?.trim() || resendEnv.fromEmail,
  };
}
