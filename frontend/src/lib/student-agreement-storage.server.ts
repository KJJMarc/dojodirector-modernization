import "server-only";

import {
  AGREEMENT_PDFS_BUCKET,
  getGuestBookingAgreementPdfStoragePath,
  getMembershipAgreementPdfStoragePath,
} from "@/lib/student-agreement-storage.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 120;

export async function uploadMembershipAgreementPdf(
  userId: string,
  version: string,
  pdfBytes: Uint8Array,
) {
  const supabase = getSupabaseAdminClient();
  const storagePath = getMembershipAgreementPdfStoragePath(userId, version);

  const { error } = await supabase.storage
    .from(AGREEMENT_PDFS_BUCKET)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to store agreement PDF: ${error.message}`);
  }

  return storagePath;
}

export async function uploadGuestBookingAgreementPdf(
  bookingId: string,
  version: string,
  pdfBytes: Uint8Array,
) {
  const supabase = getSupabaseAdminClient();
  const storagePath = getGuestBookingAgreementPdfStoragePath(bookingId, version);

  const { error } = await supabase.storage
    .from(AGREEMENT_PDFS_BUCKET)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to store guest agreement PDF: ${error.message}`);
  }

  return storagePath;
}

export async function createMembershipAgreementPdfSignedUrl(storagePath: string) {
  const supabase = getSupabaseAdminClient();
  const filename = storagePath.split("/").pop() ?? "membership-agreement.pdf";

  const { data, error } = await supabase.storage
    .from(AGREEMENT_PDFS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
      download: filename,
    });

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message ?? "Unable to create a secure download link for the agreement PDF.",
    );
  }

  return data.signedUrl;
}
