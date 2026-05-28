export type AttendanceStatus = "present" | "absent" | null;

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface SessionAttendee {
  id: string;
  session_id: string;
  user_id: string;
  attendance_status: AttendanceStatus;
  users: UserProfile | UserProfile[] | null;
}

export interface ClassSession {
  id: string;
  class_name: string;
  starts_at: string;
  location: string | null;
  session_attendees: SessionAttendee[];
}
