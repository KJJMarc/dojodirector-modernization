import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import type { ProgrammeType } from "@/lib/admin-programme-types";
import {
  sortRecurringClassSchedules,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";
import type { CreateRecurringClassInput } from "@/lib/admin-recurring-classes.input";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { RecurringClassScheduleRow, CreateRecurringClassInput };

interface RecurringScheduleQueryRow {
  id: string;
  club_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  location: string;
  is_active: boolean;
}

interface ClassTemplateRow {
  id: string;
  name: string;
  programme_type: ProgrammeType;
}

function mapRecurringScheduleRow(
  row: RecurringScheduleQueryRow,
  classById: Map<string, ClassTemplateRow>,
): RecurringClassScheduleRow {
  const classRow = classById.get(row.class_id);

  return {
    id: row.id,
    clubId: row.club_id,
    classId: row.class_id,
    className: classRow?.name ?? "Unnamed class",
    programmeType: classRow?.programme_type ?? "bjj",
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    capacity: row.capacity,
    location: row.location,
    isActive: row.is_active,
  };
}

async function getClassTemplatesById(
  classIds: string[],
): Promise<Map<string, ClassTemplateRow>> {
  if (classIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, programme_type")
    .in("id", classIds);

  if (error) {
    throw new Error(`Failed to load class templates: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as ClassTemplateRow[]).map((row) => [row.id, row]),
  );
}

export async function getRecurringClassSchedules(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringClassScheduleRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
    )
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Failed to load recurring classes: ${error.message}`);
  }

  const rows = (data ?? []) as RecurringScheduleQueryRow[];
  const classById = await getClassTemplatesById(
    Array.from(new Set(rows.map((row) => row.class_id))),
  );

  return sortRecurringClassSchedules(
    rows.map((row) => mapRecurringScheduleRow(row, classById)),
  );
}

export async function getRecurringClassScheduleById(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringClassScheduleRow | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
    )
    .eq("id", scheduleId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load recurring class: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const classById = await getClassTemplatesById([(data as RecurringScheduleQueryRow).class_id]);

  return mapRecurringScheduleRow(data as RecurringScheduleQueryRow, classById);
}

async function findOrCreateClassTemplate(
  clubId: string,
  className: string,
  programmeType: ProgrammeType,
) {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("id, programme_type, is_active")
    .eq("club_id", clubId)
    .eq("name", className)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load class template: ${existingError.message}`);
  }

  if (existing) {
    if (existing.programme_type !== programmeType) {
      throw new Error(
        `Class "${className}" already exists with programme type ${existing.programme_type}.`,
      );
    }

    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("classes")
    .insert({
      club_id: clubId,
      name: className,
      programme_type: programmeType,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Unable to create class template: ${createError.message}`);
  }

  return created.id as string;
}

export async function createRecurringClassSchedule(
  input: CreateRecurringClassInput,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();
  const classId = await findOrCreateClassTemplate(
    clubId,
    input.className,
    input.programmeType,
  );

  const { data: createdSchedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .insert({
      club_id: clubId,
      class_id: classId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      capacity: input.capacity,
      location: input.location,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single();

  if (scheduleError) {
    throw new Error(`Unable to create recurring class: ${scheduleError.message}`);
  }

  const scheduleId = createdSchedule?.id;

  if (!scheduleId) {
    throw new Error("Unable to create recurring class: missing schedule id.");
  }

  if (input.isActive ?? true) {
    const { error: generateError } = await supabase.rpc(
      "generate_recurring_class_sessions",
      {
        p_schedule_id: scheduleId,
        p_days_ahead: 55,
      },
    );

    if (generateError) {
      throw new Error(
        `Recurring class created but session generation failed: ${generateError.message}`,
      );
    }
  }

  return scheduleId as string;
}

export async function deactivateRecurringClassSchedule(scheduleId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("deactivate_recurring_class_schedule", {
    p_schedule_id: scheduleId,
  });

  if (error) {
    throw new Error(`Unable to deactivate recurring class: ${error.message}`);
  }
}

export async function reactivateRecurringClassSchedule(scheduleId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("reactivate_recurring_class_schedule", {
    p_schedule_id: scheduleId,
  });

  if (error) {
    throw new Error(`Unable to reactivate recurring class: ${error.message}`);
  }
}
