import "server-only";

import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClubRow } from "@/lib/clubs.shared";

interface ClubQueryRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
}

function mapClubRow(row: ClubQueryRow): ClubRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active ?? true,
  };
}

export async function listClubs(): Promise<ClubRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, slug, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load clubs: ${error.message}`);
  }

  return ((data ?? []) as ClubQueryRow[]).map(mapClubRow);
}

export async function getClubBySlug(slug: string): Promise<ClubRow | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, slug, is_active")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapClubRow(data as ClubQueryRow);
}

export async function requireClubBySlug(slug: string): Promise<ClubRow> {
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return club;
}

export async function getClubSlugById(clubId: string): Promise<string | null> {
  const normalizedId = clubId.trim();

  if (!normalizedId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club slug: ${error.message}`);
  }

  return (data as { slug: string } | null)?.slug ?? null;
}
