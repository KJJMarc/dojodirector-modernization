import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  parseCapacityField,
  parseProgrammeType,
  parseRequiredText,
  parseTimeField,
  ProgrammeType,
} from "@/lib/admin-programme-types";
import {
  assertClassProgrammeTypeAllowedForClub,
  resolveClubProgrammeIdForType,
} from "@/lib/admin-recurring-classes.server";
import {
  buildAdminSessionExternalId,
  londonLocalDateTimeToUtcIso,
} from "@/lib/london-datetime";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreateOneOffEventInput {
  title: string;
  programmeType: ProgrammeType;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  description: string | null;
}

export function parseCreateOneOffEventInput(formData: FormData): CreateOneOffEventInput {
  const title = parseRequiredText(formData.get("title"), "Title");
  const programmeType = parseProgrammeType(String(formData.get("programmeType") ?? ""));
  const date = parseRequiredText(formData.get("date"), "Date");
  const startTime = parseTimeField(String(formData.get("startTime") ?? ""), "Start time");
  const endTime = parseTimeField(String(formData.get("endTime") ?? ""), "End time");
  const capacity = parseCapacityField(formData.get("capacity"));
  const location = parseRequiredText(formData.get("location"), "Venue/location");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  return {
    title,
    programmeType,
    date,
    startTime,
    endTime,
    capacity,
    location,
    description,
  };
}

async function findOrCreateEventClassTemplate(
  clubId: string,
  title: string,
  programmeType: ProgrammeType,
  description: string | null,
) {
  const supabase = getSupabaseAdminClient();
  const programmeId = await resolveClubProgrammeIdForType(clubId, programmeType);

  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("id, programme_type, programme_id, description")
    .eq("club_id", clubId)
    .eq("name", title)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load class template: ${existingError.message}`);
  }

  if (existing) {
    if (existing.programme_type !== programmeType) {
      throw new Error(
        `An event titled "${title}" already exists with programme type ${existing.programme_type}.`,
      );
    }

    if (programmeId && !existing.programme_id) {
      const { error: linkError } = await supabase
        .from("classes")
        .update({
          programme_id: programmeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("club_id", clubId);

      if (linkError) {
        throw new Error(
          `Unable to link event class template to programme: ${linkError.message}`,
        );
      }
    }

    if (description && description !== existing.description) {
      const { error: updateError } = await supabase
        .from("classes")
        .update({ description, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Unable to update event description: ${updateError.message}`);
      }
    }

    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("classes")
    .insert({
      club_id: clubId,
      name: title,
      programme_type: programmeType,
      programme_id: programmeId,
      description,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Unable to create event class template: ${createError.message}`);
  }

  return created.id as string;
}

export async function createOneOffEvent(
  input: CreateOneOffEventInput,
  clubId: string = ACTIVE_CLUB_ID,
  clubSlug?: string,
) {
  if (clubSlug) {
    await assertClassProgrammeTypeAllowedForClub({
      clubId,
      clubSlug,
      programmeType: input.programmeType,
    });
  }

  const supabase = getSupabaseAdminClient();
  const classId = await findOrCreateEventClassTemplate(
    clubId,
    input.title,
    input.programmeType,
    input.description,
  );

  const startsAt = londonLocalDateTimeToUtcIso(input.date, input.startTime);
  const endsAt = londonLocalDateTimeToUtcIso(input.date, input.endTime);

  const { data: duplicate, error: duplicateError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId)
    .eq("class_id", classId)
    .eq("starts_at", startsAt)
    .maybeSingle();

  if (duplicateError) {
    throw new Error(`Unable to check existing session: ${duplicateError.message}`);
  }

  if (duplicate) {
    throw new Error("A session already exists for this event at the same date and time.");
  }

  const { data: session, error: insertError } = await supabase
    .from("class_sessions")
    .insert({
      class_id: classId,
      club_id: clubId,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: input.capacity,
      status: "scheduled",
      source: "admin_one_off",
      external_id: buildAdminSessionExternalId({
        prefix: "admin_one_off",
        classId,
        date: input.date,
        startTime: input.startTime,
        location: input.location,
      }),
      recurring_schedule_id: null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Unable to create one-off event session: ${insertError.message}`);
  }

  return session.id as string;
}
