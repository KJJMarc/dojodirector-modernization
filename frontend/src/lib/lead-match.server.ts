import "server-only";

import {
  normalizeLeadMatchEmail,
  normalizeLeadMatchPhone,
} from "@/lib/lead-guest-booking-match.shared";
import { pickCanonicalLeadMatch } from "@/lib/lead-match.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

export interface CanonicalLeadMatchRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  programme_interest: string;
  experience_level: string;
  lead_source: string;
  status: string;
  notes: string | null;
  created_at: string;
  gclid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer_url?: string | null;
}

const CANONICAL_LEAD_MATCH_COLUMNS =
  "id, full_name, email, phone, programme_interest, experience_level, lead_source, status, notes, created_at, gclid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_url";

let leadArchivedColumnAvailable: boolean | null = null;

function isMissingLeadsTableError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes('relation "leads" does not exist') ||
    message.includes('relation "public.leads" does not exist')
  );
}

function isMissingLeadArchivedColumnError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    (error.code === "42703" && message.includes("archived_at")) ||
    (error.code === "PGRST204" && message.includes("archived_at"))
  );
}

async function checkLeadArchivedColumnAvailable() {
  if (leadArchivedColumnAvailable !== null) {
    return leadArchivedColumnAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("leads").select("id, archived_at").limit(0);

  if (error && isMissingLeadArchivedColumnError(error)) {
    leadArchivedColumnAvailable = false;
    return false;
  }

  leadArchivedColumnAvailable = !error;
  return leadArchivedColumnAvailable;
}

function normalizeLeadMatchFullName(fullName: string | null | undefined): string | null {
  const normalized = fullName?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

  return normalized.length >= 3 ? normalized : null;
}

async function loadCanonicalLeadRows(
  academyId: string,
  applyArchivedFilter: boolean,
): Promise<CanonicalLeadMatchRow[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("leads")
    .select(CANONICAL_LEAD_MATCH_COLUMNS)
    .eq("academy_id", academyId)
    .order("created_at", { ascending: true });

  if (applyArchivedFilter) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingLeadsTableError(error)) {
      return [];
    }

    throw new Error(`Failed to load lead matches: ${error.message}`);
  }

  return (data ?? []) as CanonicalLeadMatchRow[];
}

export async function findCanonicalLeadById(
  academyId: string,
  leadId: string,
): Promise<CanonicalLeadMatchRow | null> {
  const supabase = getSupabaseAdminClient();
  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();

  let query = supabase
    .from("leads")
    .select(CANONICAL_LEAD_MATCH_COLUMNS)
    .eq("academy_id", academyId)
    .eq("id", leadId);

  if (archivedColumnAvailable) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (isMissingLeadsTableError(error)) {
      return null;
    }

    throw new Error(`Failed to match lead by id: ${error.message}`);
  }

  return (data as CanonicalLeadMatchRow | null) ?? null;
}

export async function findCanonicalLeadByEmail(
  academyId: string,
  email: string,
): Promise<CanonicalLeadMatchRow | null> {
  const normalizedEmail = normalizeLeadMatchEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();

  let query = supabase
    .from("leads")
    .select(CANONICAL_LEAD_MATCH_COLUMNS)
    .eq("academy_id", academyId)
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: true });

  if (archivedColumnAvailable) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingLeadsTableError(error)) {
      return null;
    }

    throw new Error(`Failed to load lead matches: ${error.message}`);
  }

  return pickCanonicalLeadMatch((data ?? []) as CanonicalLeadMatchRow[]);
}

export async function findCanonicalLeadByPhone(
  academyId: string,
  phone: string,
): Promise<CanonicalLeadMatchRow | null> {
  const normalizedPhone = normalizeLeadMatchPhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();
  const rows = await loadCanonicalLeadRows(academyId, archivedColumnAvailable);
  const matches = rows.filter(
    (row) => normalizeLeadMatchPhone(row.phone) === normalizedPhone,
  );

  return pickCanonicalLeadMatch(matches);
}

export async function findCanonicalLeadByFullName(
  academyId: string,
  fullName: string,
): Promise<CanonicalLeadMatchRow | null> {
  const normalizedFullName = normalizeLeadMatchFullName(fullName);

  if (!normalizedFullName) {
    return null;
  }

  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();
  const rows = await loadCanonicalLeadRows(academyId, archivedColumnAvailable);
  const matches = rows.filter(
    (row) => normalizeLeadMatchFullName(row.full_name) === normalizedFullName,
  );

  return pickCanonicalLeadMatch(matches);
}

export async function findCanonicalLeadForMatch(input: {
  academyId: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  leadId?: string | null;
}): Promise<CanonicalLeadMatchRow | null> {
  if (input.leadId) {
    const byId = await findCanonicalLeadById(input.academyId, input.leadId);

    if (byId) {
      return byId;
    }
  }

  const normalizedEmail = normalizeLeadMatchEmail(input.email);

  if (normalizedEmail) {
    const byEmail = await findCanonicalLeadByEmail(input.academyId, normalizedEmail);

    if (byEmail) {
      return byEmail;
    }
  }

  const normalizedPhone = normalizeLeadMatchPhone(input.phone);

  if (normalizedPhone) {
    const byPhone = await findCanonicalLeadByPhone(input.academyId, normalizedPhone);

    if (byPhone) {
      return byPhone;
    }
  }

  if (input.fullName) {
    return findCanonicalLeadByFullName(input.academyId, input.fullName);
  }

  return null;
}
