# DojoDirector 2.0 Modern Database Schema

## Purpose

This document defines the proposed modern database schema for DojoDirector 2.0.

The goal is not to copy the old Rails database directly. The goal is to preserve the useful business logic while simplifying the structure for a modern Next.js + Supabase/PostgreSQL rebuild.

## Legacy to Modern Mapping

| Legacy Rails Table | Modern Table | Notes |
|---|---|---|
| `users` | `users` | Students, admins and instructors |
| `clubs` | `clubs` | Academies/gyms |
| `club_users` | `memberships` | Relationship between user and club |
| `attendances` | `attendance_records` | Simple attendance history |
| `events` | `classes` / `class_sessions` | Separate class type from individual session |
| `event_attendees` | `session_attendees` | Bookings and attendance for class sessions |
| `levels` | `belt_levels` | Belts/stripes/ranks |
| `user_levels` | `grade_awards` | Belt/stripe award history |
| `roles`, `users_roles` | `roles`, `user_roles` | Admin/student/instructor permissions |
| `addresses` | optional later | Not MVP unless needed |
| `badges`, `user_badges` | defer | Not MVP |
| `messages`, `group_messages` | defer | Not MVP |
| `announcements`, `feed_items` | defer | Not MVP |
| `tokens` | progression rules later | Could become grading eligibility logic |

---

# Core MVP Tables

## 1. users

Stores all people in the system: students, instructors and admins.

```sql
users
- id uuid primary key
- first_name text not null
- last_name text not null
- email text unique
- phone text
- date_of_birth date
- gender text
- avatar_url text
- notes text
- is_active boolean default true
- legacy_user_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Notes:
- `legacy_user_id` preserves the original Rails user ID for migration.
- Authentication may be handled by Supabase Auth, so this table may link to `auth.users`.

---

## 2. clubs

Stores academies/gyms.

```sql
clubs
- id uuid primary key
- name text not null
- website_url text
- phone text
- emergency_phone text
- logo_url text
- is_active boolean default true
- legacy_club_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Notes:
- For KJJ initially this may contain only one club.
- Keeping the club structure allows future multi-club support.

---

## 3. memberships

Links users to clubs and stores their club-specific status.

```sql
memberships
- id uuid primary key
- user_id uuid references users(id) on delete cascade
- club_id uuid references clubs(id) on delete cascade
- status text default 'active'
- role text default 'student'
- joined_at date
- suspended_at timestamptz
- notes text
- legacy_club_user_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `status` values:
- active
- suspended
- inactive
- trial
- archived

Suggested `role` values:
- student
- instructor
- admin
- owner

Notes:
- This replaces `club_users`.
- Role can be simple here at first, with more granular role tables later if needed.

---

## 4. belt_levels

Defines belts, stripes and progression levels.

```sql
belt_levels
- id uuid primary key
- club_id uuid references clubs(id) on delete cascade
- name text not null
- type text default 'belt'
- colour text
- stripe_count integer default 0
- sort_order integer not null
- minimum_attendances integer
- minimum_weeks integer
- legacy_level_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `type` values:
- belt
- stripe
- rank

Notes:
- The old `levels` table contained rank progression information.
- This new table should be flexible enough for kids belts, adult belts and stripes.

---

## 5. grade_awards

Stores every belt/stripe/rank awarded to a student.

```sql
grade_awards
- id uuid primary key
- user_id uuid references users(id) on delete cascade
- club_id uuid references clubs(id) on delete cascade
- belt_level_id uuid references belt_levels(id)
- awarded_at date not null
- awarded_by_user_id uuid references users(id)
- notes text
- legacy_user_level_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Notes:
- This replaces `user_levels`.
- It preserves grading history rather than just storing current rank.
- Current grade can be calculated from latest award by `awarded_at` and belt sort order.

---

## 6. classes

Defines a recurring class type, such as Adult BJJ, Kids BJJ or Open Mat.

```sql
classes
- id uuid primary key
- club_id uuid references clubs(id) on delete cascade
- name text not null
- description text
- programme_type text not null default 'bjj'
- default_instructor_id uuid references users(id)
- is_active boolean default true
- legacy_event_collection_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `programme_type` values:
- bjj
- muay_thai
- strength_conditioning

Notes:
- Only `bjj` classes should count toward BJJ attendance cards and grading eligibility.

Examples:
- Adult BJJ Fundamentals
- Adult BJJ Advanced
- Kids BJJ
- Muay Thai
- Open Mat

Notes:
- This replaces part of the old `event_collections` / `events` structure.

---

## 7. class_sessions

Stores a specific instance of a class on a specific date/time.

```sql
class_sessions
- id uuid primary key
- class_id uuid references classes(id) on delete cascade
- club_id uuid references clubs(id) on delete cascade
- starts_at timestamptz not null
- ends_at timestamptz
- instructor_id uuid references users(id)
- capacity integer
- status text default 'scheduled'
- source text default 'manual'
- external_id text
- legacy_event_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `status` values:
- scheduled
- cancelled
- completed

Suggested `source` values:
- manual
- bookwhen
- legacy_import

Notes:
- This allows Bookwhen sessions to be imported later.
- `external_id` can store the Bookwhen event/session ID.

---

## 8. session_attendees

Stores bookings and attendance state for a class session.

```sql
session_attendees
- id uuid primary key
- class_session_id uuid references class_sessions(id) on delete cascade
- user_id uuid references users(id) on delete cascade
- booking_status text default 'booked'
- attendance_status text default 'not_marked'
- booked_at timestamptz
- marked_at timestamptz
- marked_by_user_id uuid references users(id)
- source text default 'manual'
- external_booking_id text
- notes text
- legacy_event_attendee_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `booking_status` values:
- booked
- cancelled
- waitlisted
- walk_in

Suggested `attendance_status` values:
- not_marked
- attended
- absent
- late

Notes:
- This table supports the desired workflow:
  - Bookwhen booking appears as a card
  - Instructor taps attended
  - Attendance card updates

---

## 9. attendance_records

Stores final attendance history.

```sql
attendance_records
- id uuid primary key
- user_id uuid references users(id) on delete cascade
- club_id uuid references clubs(id) on delete cascade
- class_session_id uuid references class_sessions(id)
- attended_on date not null
- attended_at timestamptz
- marked_by_user_id uuid references users(id)
- source text default 'manual'
- legacy_attendance_id integer
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

Suggested `source` values:
- manual
- session_attendee
- bookwhen
- legacy_import

Notes:
- This preserves the simplicity of the old `attendances` table.
- A user can have attendance history even if it was not attached to a specific class session.
- For old data, `class_session_id` may be null.

Important constraint:

```sql
unique(user_id, club_id, attended_on, class_session_id)
```

This prevents duplicate attendance records for the same student and session.

---

## 10. roles and permissions

For MVP, roles can be handled simply in `memberships.role`.

If more granular permissions are needed later:

```sql
roles
- id uuid primary key
- name text not null unique
- description text
- created_at timestamptz default now()
```

```sql
user_roles
- id uuid primary key
- user_id uuid references users(id) on delete cascade
- club_id uuid references clubs(id) on delete cascade
- role_id uuid references roles(id) on delete cascade
- created_at timestamptz default now()
```

Suggested roles:
- owner
- admin
- instructor
- student

---

# Deferred / Non-MVP Features

These existed in the old Rails app but should not be part of the initial rebuild unless clearly needed.

## Messaging
Legacy tables:
- `messages`
- `group_messages`

Recommendation:
- Defer.
- Use email/WhatsApp/Facebook/Bookwhen communications initially.

## Badges and achievements
Legacy tables:
- `badges`
- `user_badges`
- `group_badges`

Recommendation:
- Defer.
- Could return later as gamification.

## Feed / announcements
Legacy tables:
- `feed_items`
- `announcements`

Recommendation:
- Defer or replace with simple admin notices later.

## Tokens / progression mechanics
Legacy table:
- `tokens`

Recommendation:
- Defer.
- Rebuild later as grading eligibility rules if useful.

## Addresses
Legacy table:
- `addresses`

Recommendation:
- Defer unless required for safeguarding, billing or emergency contact workflows.

---

# MVP Build Order

## Phase 1: Read-only migrated prototype

Goal: prove that old data can be imported and displayed correctly.

Build:
- Users
- Clubs
- Memberships
- Attendance history
- Belt/grade history
- Basic admin dashboard
- Student profile page

No editing yet.

## Phase 2: Admin editing

Build:
- Edit member profile
- Mark attendance
- Amend attendance
- Award belt/stripe
- Add admin notes

## Phase 3: Class/session workflow

Build:
- Classes
- Class sessions
- Session attendees
- Instructor attendance register
- Mobile tap-based attendance UI

## Phase 4: Bookwhen integration

Build:
- Import Bookwhen sessions
- Import Bookwhen bookings
- Match Bookwhen attendees to users
- Mark attendance from imported booking cards

## Phase 5: Reporting

Build:
- Attendance reports
- Inactive students
- Grading eligibility
- Class popularity
- Export CSV

---

# First Prototype Goal

The first prototype should answer one question:

> Can we import the legacy users, attendance records and belt history into a modern database and display them cleanly in a responsive admin interface?

If yes, the rebuild is viable and can proceed incrementally.

