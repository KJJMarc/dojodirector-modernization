-- Backfill lead statuses from attendance register marks where lead sync failed.
-- Does NOT use guest_bookings.lead_id (column may be absent in production).
--
-- Match rules (same academy only):
--   Student register rows (session_attendees.user_id):
--     member email, member phone, member full name
--   Guest register rows (session_attendees.guest_booking_id):
--     guest email, guest phone, guest booker name, guest participant name
--
-- Usage (Supabase SQL editor):
--   1. Run PREVIEW: Present and PREVIEW: Absent below.
--   2. Run APPLY inside BEGIN … COMMIT when previews look correct.
--   3. Re-run previews — expect zero rows.
--
-- Optional academy filter — add to every register_attendance CTE:
--   AND cs.club_id = (SELECT id FROM public.clubs WHERE slug = 'kingston-jiu-jitsu')

-- ---------------------------------------------------------------------------
-- PREVIEW: Present on register, lead still missing trial_attended_at
-- ---------------------------------------------------------------------------
WITH register_attendance AS (
  SELECT
    sa.id AS session_attendee_id,
    sa.attendance_status,
    cs.club_id AS academy_id,
    cs.starts_at AS marked_at,
    COALESCE(NULLIF(trim(c.name), ''), 'Class') AS class_name,
    (sa.user_id IS NOT NULL) AS is_member_row,
    (sa.guest_booking_id IS NOT NULL) AS is_guest_row,
    lower(
      trim(
        COALESCE(
          NULLIF(trim(u.email), ''),
          NULLIF(trim(u.portal_login_email), '')
        )
      )
    ) AS member_email_norm,
    regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') AS member_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', u.first_name, u.last_name)), '\s+', ' ', 'g')
    ) AS member_name_norm,
    lower(trim(gb.email)) AS guest_email_norm,
    regexp_replace(COALESCE(gb.phone, ''), '\D', '', 'g') AS guest_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', gb.first_name, gb.last_name)), '\s+', ' ', 'g')
    ) AS guest_name_norm,
    lower(
      regexp_replace(trim(COALESCE(gb.participant_name, '')), '\s+', ' ', 'g')
    ) AS guest_participant_name_norm
  FROM public.session_attendees sa
  INNER JOIN public.class_sessions cs ON cs.id = sa.class_session_id
  LEFT JOIN public.classes c ON c.id = cs.class_id
  LEFT JOIN public.users u ON u.id = sa.user_id
  LEFT JOIN public.guest_bookings gb ON gb.id = sa.guest_booking_id
  WHERE sa.attendance_status IN ('present', 'absent')
    AND COALESCE(cs.status, '') <> 'cancelled'
),
lead_register_match AS (
  SELECT DISTINCT ON (l.id, ra.attendance_status)
    l.id AS lead_id,
    l.full_name,
    l.email AS lead_email,
    l.status AS current_status,
    l.trial_attended_at,
    ra.attendance_status,
    ra.marked_at,
    ra.class_name,
    cl.name AS academy_name,
    cl.slug AS academy_slug,
    CASE
      WHEN ra.is_member_row AND ra.member_email_norm IS NOT NULL
        AND ra.member_email_norm LIKE '%@%'
        AND lower(trim(l.email)) = ra.member_email_norm THEN 'member_email'
      WHEN ra.is_member_row
        AND length(ra.member_phone_digits) >= 7
        AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
        AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.member_phone_digits THEN 'member_phone'
      WHEN ra.is_member_row
        AND ra.member_name_norm IS NOT NULL
        AND ra.member_name_norm <> ''
        AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.member_name_norm THEN 'member_name'
      WHEN ra.is_guest_row
        AND ra.guest_email_norm IS NOT NULL
        AND ra.guest_email_norm LIKE '%@%'
        AND lower(trim(l.email)) = ra.guest_email_norm THEN 'guest_email'
      WHEN ra.is_guest_row
        AND length(ra.guest_phone_digits) >= 7
        AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
        AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.guest_phone_digits THEN 'guest_phone'
      WHEN ra.is_guest_row
        AND ra.guest_name_norm IS NOT NULL
        AND ra.guest_name_norm <> ''
        AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_name_norm THEN 'guest_name'
      WHEN ra.is_guest_row
        AND ra.guest_participant_name_norm IS NOT NULL
        AND ra.guest_participant_name_norm <> ''
        AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_participant_name_norm THEN 'guest_participant_name'
      ELSE 'unknown'
    END AS match_method
  FROM register_attendance ra
  INNER JOIN public.leads l ON l.academy_id = ra.academy_id
  INNER JOIN public.clubs cl ON cl.id = l.academy_id
  WHERE l.archived_at IS NULL
    AND l.status <> 'joined'
    AND (
      (
        ra.is_member_row
        AND (
          (
            ra.member_email_norm IS NOT NULL
            AND ra.member_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.member_email_norm
          )
          OR (
            length(ra.member_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.member_phone_digits
          )
          OR (
            ra.member_name_norm IS NOT NULL
            AND ra.member_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.member_name_norm
          )
        )
      )
      OR (
        ra.is_guest_row
        AND (
          (
            ra.guest_email_norm IS NOT NULL
            AND ra.guest_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.guest_email_norm
          )
          OR (
            length(ra.guest_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.guest_phone_digits
          )
          OR (
            ra.guest_name_norm IS NOT NULL
            AND ra.guest_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_name_norm
          )
          OR (
            ra.guest_participant_name_norm IS NOT NULL
            AND ra.guest_participant_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_participant_name_norm
          )
        )
      )
    )
  ORDER BY l.id, ra.attendance_status, ra.marked_at DESC
)
SELECT
  academy_name,
  full_name,
  lead_email,
  current_status,
  trial_attended_at,
  marked_at AS register_present_at,
  class_name,
  match_method,
  lead_id
FROM lead_register_match
WHERE attendance_status = 'present'
  AND trial_attended_at IS NULL
ORDER BY academy_name, marked_at DESC;

-- ---------------------------------------------------------------------------
-- PREVIEW: Absent on register (skips leads that also have Present)
-- ---------------------------------------------------------------------------
WITH register_attendance AS (
  SELECT
    sa.attendance_status,
    cs.club_id AS academy_id,
    cs.starts_at AS marked_at,
    COALESCE(NULLIF(trim(c.name), ''), 'Class') AS class_name,
    (sa.user_id IS NOT NULL) AS is_member_row,
    (sa.guest_booking_id IS NOT NULL) AS is_guest_row,
    lower(
      trim(
        COALESCE(
          NULLIF(trim(u.email), ''),
          NULLIF(trim(u.portal_login_email), '')
        )
      )
    ) AS member_email_norm,
    regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') AS member_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', u.first_name, u.last_name)), '\s+', ' ', 'g')
    ) AS member_name_norm,
    lower(trim(gb.email)) AS guest_email_norm,
    regexp_replace(COALESCE(gb.phone, ''), '\D', '', 'g') AS guest_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', gb.first_name, gb.last_name)), '\s+', ' ', 'g')
    ) AS guest_name_norm,
    lower(
      regexp_replace(trim(COALESCE(gb.participant_name, '')), '\s+', ' ', 'g')
    ) AS guest_participant_name_norm
  FROM public.session_attendees sa
  INNER JOIN public.class_sessions cs ON cs.id = sa.class_session_id
  LEFT JOIN public.classes c ON c.id = cs.class_id
  LEFT JOIN public.users u ON u.id = sa.user_id
  LEFT JOIN public.guest_bookings gb ON gb.id = sa.guest_booking_id
  WHERE sa.attendance_status IN ('present', 'absent')
    AND COALESCE(cs.status, '') <> 'cancelled'
),
lead_register_match AS (
  SELECT DISTINCT ON (l.id, ra.attendance_status)
    l.id AS lead_id,
    l.full_name,
    l.email AS lead_email,
    l.status AS current_status,
    ra.attendance_status,
    ra.marked_at,
    ra.class_name,
    cl.name AS academy_name
  FROM register_attendance ra
  INNER JOIN public.leads l ON l.academy_id = ra.academy_id
  INNER JOIN public.clubs cl ON cl.id = l.academy_id
  WHERE l.archived_at IS NULL
    AND l.status <> 'joined'
    AND l.trial_attended_at IS NULL
    AND (
      (
        ra.is_member_row
        AND (
          (
            ra.member_email_norm IS NOT NULL
            AND ra.member_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.member_email_norm
          )
          OR (
            length(ra.member_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.member_phone_digits
          )
          OR (
            ra.member_name_norm IS NOT NULL
            AND ra.member_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.member_name_norm
          )
        )
      )
      OR (
        ra.is_guest_row
        AND (
          (
            ra.guest_email_norm IS NOT NULL
            AND ra.guest_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.guest_email_norm
          )
          OR (
            length(ra.guest_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.guest_phone_digits
          )
          OR (
            ra.guest_name_norm IS NOT NULL
            AND ra.guest_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_name_norm
          )
          OR (
            ra.guest_participant_name_norm IS NOT NULL
            AND ra.guest_participant_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_participant_name_norm
          )
        )
      )
    )
  ORDER BY l.id, ra.attendance_status, ra.marked_at DESC
),
present_lead_ids AS (
  SELECT lead_id
  FROM lead_register_match
  WHERE attendance_status = 'present'
)
SELECT
  m.academy_name,
  m.full_name,
  m.lead_email,
  m.current_status,
  m.marked_at,
  m.class_name,
  m.lead_id
FROM lead_register_match m
WHERE m.attendance_status = 'absent'
  AND m.current_status IN (
    'new_enquiry',
    'trial_booked',
    'trial_missed',
    'new',
    'contacted'
  )
  AND m.lead_id NOT IN (SELECT lead_id FROM present_lead_ids)
ORDER BY m.marked_at DESC;

-- ---------------------------------------------------------------------------
-- APPLY: Present → trial_attended (+ trial_attended_at)
-- ---------------------------------------------------------------------------
BEGIN;

WITH register_attendance AS (
  SELECT
    sa.attendance_status,
    cs.club_id AS academy_id,
    cs.starts_at AS marked_at,
    COALESCE(NULLIF(trim(c.name), ''), 'Class') AS class_name,
    (sa.user_id IS NOT NULL) AS is_member_row,
    (sa.guest_booking_id IS NOT NULL) AS is_guest_row,
    lower(
      trim(
        COALESCE(
          NULLIF(trim(u.email), ''),
          NULLIF(trim(u.portal_login_email), '')
        )
      )
    ) AS member_email_norm,
    regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') AS member_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', u.first_name, u.last_name)), '\s+', ' ', 'g')
    ) AS member_name_norm,
    lower(trim(gb.email)) AS guest_email_norm,
    regexp_replace(COALESCE(gb.phone, ''), '\D', '', 'g') AS guest_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', gb.first_name, gb.last_name)), '\s+', ' ', 'g')
    ) AS guest_name_norm,
    lower(
      regexp_replace(trim(COALESCE(gb.participant_name, '')), '\s+', ' ', 'g')
    ) AS guest_participant_name_norm
  FROM public.session_attendees sa
  INNER JOIN public.class_sessions cs ON cs.id = sa.class_session_id
  LEFT JOIN public.classes c ON c.id = cs.class_id
  LEFT JOIN public.users u ON u.id = sa.user_id
  LEFT JOIN public.guest_bookings gb ON gb.id = sa.guest_booking_id
  WHERE sa.attendance_status = 'present'
    AND COALESCE(cs.status, '') <> 'cancelled'
),
present_lead_updates AS (
  SELECT DISTINCT ON (l.id)
    l.id AS lead_id,
    ra.marked_at,
    ra.class_name,
    to_char(ra.marked_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY, HH24:MI') AS marked_label,
    to_char(ra.marked_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY') AS session_date_label
  FROM register_attendance ra
  INNER JOIN public.leads l ON l.academy_id = ra.academy_id
  WHERE l.archived_at IS NULL
    AND l.status <> 'joined'
    AND l.trial_attended_at IS NULL
    AND (
      (
        ra.is_member_row
        AND (
          (
            ra.member_email_norm IS NOT NULL
            AND ra.member_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.member_email_norm
          )
          OR (
            length(ra.member_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.member_phone_digits
          )
          OR (
            ra.member_name_norm IS NOT NULL
            AND ra.member_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.member_name_norm
          )
        )
      )
      OR (
        ra.is_guest_row
        AND (
          (
            ra.guest_email_norm IS NOT NULL
            AND ra.guest_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.guest_email_norm
          )
          OR (
            length(ra.guest_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.guest_phone_digits
          )
          OR (
            ra.guest_name_norm IS NOT NULL
            AND ra.guest_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_name_norm
          )
          OR (
            ra.guest_participant_name_norm IS NOT NULL
            AND ra.guest_participant_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_participant_name_norm
          )
        )
      )
    )
  ORDER BY l.id, ra.marked_at DESC
)
UPDATE public.leads l
SET
  status = 'trial_attended',
  trial_attended_at = u.marked_at,
  last_activity_at = GREATEST(COALESCE(l.last_activity_at, u.marked_at), u.marked_at),
  updated_at = now(),
  notes = CASE
    WHEN coalesce(trim(l.notes), '') = '' THEN
      format(
        '[%s] Trial attendance recorded (register backfill): %s — %s',
        u.marked_label,
        u.class_name,
        u.session_date_label
      )
    ELSE
      l.notes || E'\n\n' || format(
        '[%s] Trial attendance recorded (register backfill): %s — %s',
        u.marked_label,
        u.class_name,
        u.session_date_label
      )
  END
FROM present_lead_updates u
WHERE l.id = u.lead_id;

-- ---------------------------------------------------------------------------
-- APPLY: Absent → trial_missed (only when no Present mark exists for that lead)
-- ---------------------------------------------------------------------------
WITH register_attendance AS (
  SELECT
    sa.attendance_status,
    cs.club_id AS academy_id,
    cs.starts_at AS marked_at,
    COALESCE(NULLIF(trim(c.name), ''), 'Class') AS class_name,
    (sa.user_id IS NOT NULL) AS is_member_row,
    (sa.guest_booking_id IS NOT NULL) AS is_guest_row,
    lower(
      trim(
        COALESCE(
          NULLIF(trim(u.email), ''),
          NULLIF(trim(u.portal_login_email), '')
        )
      )
    ) AS member_email_norm,
    regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') AS member_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', u.first_name, u.last_name)), '\s+', ' ', 'g')
    ) AS member_name_norm,
    lower(trim(gb.email)) AS guest_email_norm,
    regexp_replace(COALESCE(gb.phone, ''), '\D', '', 'g') AS guest_phone_digits,
    lower(
      regexp_replace(trim(concat_ws(' ', gb.first_name, gb.last_name)), '\s+', ' ', 'g')
    ) AS guest_name_norm,
    lower(
      regexp_replace(trim(COALESCE(gb.participant_name, '')), '\s+', ' ', 'g')
    ) AS guest_participant_name_norm
  FROM public.session_attendees sa
  INNER JOIN public.class_sessions cs ON cs.id = sa.class_session_id
  LEFT JOIN public.classes c ON c.id = cs.class_id
  LEFT JOIN public.users u ON u.id = sa.user_id
  LEFT JOIN public.guest_bookings gb ON gb.id = sa.guest_booking_id
  WHERE sa.attendance_status IN ('present', 'absent')
    AND COALESCE(cs.status, '') <> 'cancelled'
),
lead_register_match AS (
  SELECT DISTINCT ON (l.id, ra.attendance_status)
    l.id AS lead_id,
    ra.attendance_status,
    ra.marked_at,
    ra.class_name,
    to_char(ra.marked_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY, HH24:MI') AS marked_label,
    to_char(ra.marked_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY') AS session_date_label
  FROM register_attendance ra
  INNER JOIN public.leads l ON l.academy_id = ra.academy_id
  WHERE l.archived_at IS NULL
    AND l.status <> 'joined'
    AND l.trial_attended_at IS NULL
    AND l.status IN (
      'new_enquiry',
      'trial_booked',
      'trial_missed',
      'new',
      'contacted'
    )
    AND (
      (
        ra.is_member_row
        AND (
          (
            ra.member_email_norm IS NOT NULL
            AND ra.member_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.member_email_norm
          )
          OR (
            length(ra.member_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.member_phone_digits
          )
          OR (
            ra.member_name_norm IS NOT NULL
            AND ra.member_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.member_name_norm
          )
        )
      )
      OR (
        ra.is_guest_row
        AND (
          (
            ra.guest_email_norm IS NOT NULL
            AND ra.guest_email_norm LIKE '%@%'
            AND lower(trim(l.email)) = ra.guest_email_norm
          )
          OR (
            length(ra.guest_phone_digits) >= 7
            AND length(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')) >= 7
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = ra.guest_phone_digits
          )
          OR (
            ra.guest_name_norm IS NOT NULL
            AND ra.guest_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_name_norm
          )
          OR (
            ra.guest_participant_name_norm IS NOT NULL
            AND ra.guest_participant_name_norm <> ''
            AND lower(regexp_replace(trim(l.full_name), '\s+', ' ', 'g')) = ra.guest_participant_name_norm
          )
        )
      )
    )
  ORDER BY l.id, ra.attendance_status, ra.marked_at DESC
),
present_lead_ids AS (
  SELECT lead_id
  FROM lead_register_match
  WHERE attendance_status = 'present'
),
absent_lead_updates AS (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    marked_at,
    class_name,
    marked_label,
    session_date_label
  FROM lead_register_match
  WHERE attendance_status = 'absent'
    AND lead_id NOT IN (SELECT lead_id FROM present_lead_ids)
  ORDER BY lead_id, marked_at DESC
)
UPDATE public.leads l
SET
  status = 'trial_missed',
  last_activity_at = GREATEST(COALESCE(l.last_activity_at, u.marked_at), u.marked_at),
  updated_at = now(),
  notes = CASE
    WHEN coalesce(trim(l.notes), '') = '' THEN
      format(
        '[%s] Trial missed on register (register backfill): %s — %s',
        u.marked_label,
        u.class_name,
        u.session_date_label
      )
    ELSE
      l.notes || E'\n\n' || format(
        '[%s] Trial missed on register (register backfill): %s — %s',
        u.marked_label,
        u.class_name,
        u.session_date_label
      )
  END
FROM absent_lead_updates u
WHERE l.id = u.lead_id
  AND l.status IN ('new_enquiry', 'trial_booked', 'new', 'contacted');

COMMIT;
