export type AttendanceStatus = "present" | "absent" | null;

export interface Student {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface SessionAttendee {
  id: string;
  session_id: string;
  student_id: string;
  attendance_status: AttendanceStatus;
  students: Student | Student[] | null;
}

export interface ClassSession {
  id: string;
  class_name: string;
  starts_at: string;
  location: string | null;
  session_attendees: SessionAttendee[];
}
