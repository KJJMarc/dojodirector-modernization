export type AttendanceStatus = "present" | "absent" | null;

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
}

export interface SessionAttendee {
  id: string;
  class_session_id: string;
  user_id: string | null;
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

export interface BeltLevel {
  id: string;
  name: string;
  colour: string | null;
  stripe_count: number | null;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  attended_on: string;
}

export interface GradeAward {
  id: string;
  user_id: string;
  awarded_at: string;
  belt_levels: BeltLevel | BeltLevel[] | null;
}
