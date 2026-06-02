import "server-only";

import { ACTIVE_CLUB_ID, ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStudentOfTheYearYearOptions,
  sortStudentOfTheYearAwardsDesc,
  type StudentOfTheYearAward,
  type StudentOfTheYearPageData,
} from "@/lib/student-of-the-year.shared";

type SupabaseErrorLike = { code?: string; message?: string } | null;

let studentOfTheYearTableAvailable: boolean | null = null;

export const STUDENT_OF_THE_YEAR_NOT_CONFIGURED_MESSAGE =
  "Student of the Year awards are not set up yet. Please run the database migration.";

interface StudentOfTheYearAwardRow {
  id: string;
  club_id: string;
  year: number;
  student_name: string;
  created_at: string;
  updated_at: string;
}

export interface StudentOfTheYearAdminEditState {
  tableAvailable: boolean;
  awards: StudentOfTheYearAward[];
  yearOptions: number[];
}

function isMissingStudentOfTheYearTableError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  if (error.code === "42P01") {
    return message.includes("student_of_the_year_awards");
  }

  if (error.code === "PGRST205" || error.code === "PGRST204") {
    return message.includes("student_of_the_year_awards");
  }

  return (
    message.includes("student_of_the_year_awards") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

function mapRow(row: StudentOfTheYearAwardRow): StudentOfTheYearAward {
  return {
    id: row.id,
    year: row.year,
    studentName: row.student_name.trim(),
  };
}

export async function isStudentOfTheYearTableAvailable(): Promise<boolean> {
  if (studentOfTheYearTableAvailable !== null) {
    return studentOfTheYearTableAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("student_of_the_year_awards")
    .select("id")
    .limit(0);

  if (isMissingStudentOfTheYearTableError(error)) {
    studentOfTheYearTableAvailable = false;
    return false;
  }

  studentOfTheYearTableAvailable = !error;
  return studentOfTheYearTableAvailable;
}

async function loadAwardRows(clubId: string): Promise<StudentOfTheYearAwardRow[]> {
  const tableAvailable = await isStudentOfTheYearTableAvailable();

  if (!tableAvailable) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("student_of_the_year_awards")
    .select("id, club_id, year, student_name, created_at, updated_at")
    .eq("club_id", clubId)
    .order("year", { ascending: false });

  if (error) {
    throw new Error(`Failed to load Student of the Year awards: ${error.message}`);
  }

  return (data ?? []) as StudentOfTheYearAwardRow[];
}

export async function getStudentOfTheYearPageData(
  clubId: string = ACTIVE_CLUB_ID,
  clubName: string = ACTIVE_CLUB_NAME,
): Promise<StudentOfTheYearPageData> {
  const rows = await loadAwardRows(clubId);

  return {
    clubName,
    awards: sortStudentOfTheYearAwardsDesc(rows.map(mapRow)),
  };
}

export async function loadStudentOfTheYearAdminEditState(
  clubId: string,
): Promise<StudentOfTheYearAdminEditState> {
  const tableAvailable = await isStudentOfTheYearTableAvailable();
  const rows = await loadAwardRows(clubId);
  const awards = sortStudentOfTheYearAwardsDesc(rows.map(mapRow));

  return {
    tableAvailable,
    awards,
    yearOptions: getStudentOfTheYearYearOptions(),
  };
}

export async function saveStudentOfTheYearAward(input: {
  clubId: string;
  year: number;
  studentName: string;
}) {
  const tableAvailable = await isStudentOfTheYearTableAvailable();

  if (!tableAvailable) {
    throw new Error(STUDENT_OF_THE_YEAR_NOT_CONFIGURED_MESSAGE);
  }

  const studentName = input.studentName.trim();

  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 9999) {
    throw new Error("Select a valid award year.");
  }

  if (!studentName) {
    throw new Error("Student name must not be blank.");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("student_of_the_year_awards").upsert(
    {
      club_id: input.clubId,
      year: input.year,
      student_name: studentName,
      updated_at: now,
    },
    { onConflict: "club_id,year" },
  );

  if (error) {
    throw new Error(`Unable to save Student of the Year award: ${error.message}`);
  }
}
