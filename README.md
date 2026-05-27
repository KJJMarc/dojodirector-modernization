# DojoDirector Modernization

## Overview

This repository contains the recovered legacy DojoDirector Rails application and modernization planning for the next-generation platform.

The original application was built using:
- Ruby 1.9.3
- Rails 3.2
- PostgreSQL
- Ubuntu 16

The system supports:
- Multi-club management
- Student/member management
- Attendance tracking
- Events/classes
- Belt/level progression
- Badges and achievements
- Messaging
- Announcements
- Role-based permissions

## Current Status

Recovery completed:
- Legacy Rails code recovered
- PostgreSQL database recovered
- AWS server access restored
- GitHub preservation repository created

## Modernization Goals

Planned rebuild stack:
- Next.js
- Tailwind CSS
- Supabase/PostgreSQL
- Vercel hosting
- Stripe integration

## MVP Goals

Phase 1:
- Read-only migrated prototype
- Member profiles
- Attendance history
- Belt/grade history
- Event history

Phase 2:
- Attendance marking
- Grade/belt management
- Reporting
- Bookwhen integration
- Mobile-first admin interface

## Notes

The legacy Rails application will be preserved as a reference system during migration rather than upgraded directly.
