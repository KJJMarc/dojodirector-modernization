export type AttendanceStatus = "present" | "absent" | null;

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
}

export interface SessionAttendee {
  id: string;
  class_session_id: string;
  user_id: string;
  attendance_status: AttendanceStatus;
  users: UserProfile | UserProfile[] | null;
}

export interface ClassSession {
  id: string;
  class_id: string;
  class_name: string;
  starts_at: string;
  location: string | null;
  classes: ClassInfo | ClassInfo[] | null;
  session_attendees: SessionAttendee[];
}
