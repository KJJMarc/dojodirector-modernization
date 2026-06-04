-- Indexes for admin students list and promotion candidate queries.

CREATE INDEX IF NOT EXISTS grade_awards_user_id_awarded_at_idx
  ON public.grade_awards (user_id, awarded_at DESC);

CREATE INDEX IF NOT EXISTS grade_awards_club_id_user_id_idx
  ON public.grade_awards (club_id, user_id);

CREATE INDEX IF NOT EXISTS attendance_records_club_user_attended_on_idx
  ON public.attendance_records (club_id, user_id, attended_on DESC);

CREATE INDEX IF NOT EXISTS attendance_records_user_id_attended_on_idx
  ON public.attendance_records (user_id, attended_on DESC);

-- programme_memberships indexes exist from 20260601120000_programmes_architecture.sql
