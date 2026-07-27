# AGENT.md

# Engineering Guidance for AI Coding Agents

## Project Summary

This repository is a Next.js HR management application built with Supabase, Tailwind CSS, and shadcn/ui. The current implementation focuses on authentication, protected app routes, a dashboard shell, employee management, attendance, time-off, reports, settings, and security-related views.

## Important Context

Before making changes:

- Read this file and the current project documentation in context.md.
- Review the existing app structure before introducing new features.
- Preserve working behavior and avoid large rewrites unless necessary.
- Prefer incremental improvements over complete redesigns.

## Tech Stack

- Next.js 15 with App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase for auth and database access

## Project Structure

- app/ contains routes and layouts
- app/(app)/ contains authenticated screens
- components/ui/ contains reusable UI primitives
- lib/ contains app logic, auth context, and shared helpers
- supabase/ contains database migrations and Edge Functions
- public/ contains static assets

## Implementation Expectations

- Keep UI consistent with the existing design language.
- Prefer reusable components from components/ui when possible.
- Use the existing auth flow via lib/auth-context.tsx.
- For employee-related changes, respect the Supabase edge function flow in supabase/functions/manage-employee/.
- Keep feature work aligned with the current navigation and layout.

## Current Priorities

Implemented or in active progress:

- Authentication and protected routing
- Dashboard shell and navigation
- Employee management
- Attendance module UI
- Time-off module UI
- Reports, settings, and security screens
- Role-based access control (API, database, and UI layers)
- Security hardening (rate limiting, input validation, privilege escalation prevention)

Planned next:

- More complete leave workflow
- Departments and designations
- Reporting enhancements
- Audit and policy management

## Coding Guidelines

- Use TypeScript and keep types explicit where possible.
- Follow the existing naming patterns in the codebase.
- Avoid introducing new state management libraries unless there is a clear need.
- Keep components focused and composable.
- When database changes are needed, add migrations and update relevant TypeScript types.

## Documentation Updates

Whenever a meaningful feature is added or changed, update:

- context.md for implementation status
- project.md for product scope and roadmap
- any related Supabase or setup documentation if behavior changes