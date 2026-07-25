# CONTEXT.md

# Current Project Context

Project Name: HR Management System (HRMS)
Last Updated: July 15, 2026
Project Status: Active Development

---

# Purpose

This document describes the current implementation state of the project so that future changes stay aligned with the existing app.

---

# Current Tech Stack

Frontend
- Next.js 15 (App Router)
- React 18.2.0
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

Deployment
- Netlify (configured via netlify.toml)

Repository
- GitHub

Development
- Visual Studio Code

---

# Current Application State

The app is a working HR management starter with a protected dashboard experience and a growing set of HR modules. The project should be evolved incrementally rather than rewritten wholesale.

---

# Implemented Features

The following features are present in the codebase:

- Authentication flow using Supabase Auth
- Protected app layout and navigation shell
- Role-aware sidebar navigation
- Dashboard landing page
- Employee management UI and employee creation/edit/delete flow
- Attendance page
- Time-off page
- Reports page
- Settings page
- Security page for super admin access
- Supabase integration and edge function-based employee management
- Shared UI components from shadcn/ui

---

# Features In Progress

- Stronger role-based permissions enforcement
- More complete leave and approval workflow
- Attendance data handling and business logic
- Reporting enhancements
- Better data validation and UX around employee profile fields

---

# Planned Features

- Payroll
- Recruitment
- Performance reviews
- Notifications and announcements
- Audit trail enhancements
- Multi-company support
- AI assistant features

---

# Current Folder Structure

The repository currently uses this structure:

app/
app/(app)/
components/
components/ui/
hooks/
lib/
supabase/
public/

This is the current baseline. New modules should fit into this existing structure rather than introducing a completely different organization.

---

# Design System

Theme
- Clean
- Corporate
- Modern
- Minimal

UI Library
- shadcn/ui

Icons
- Lucide React

Styling
- Tailwind CSS

Responsive Support
- Mobile
- Tablet
- Desktop

---

# Database and Backend Status

Supabase is the primary backend.

Current implementation touches:
- profiles
- employee management via Supabase Edge Functions
- authentication

Future work should continue to use migrations and typed interfaces where relevant.

---

# Authentication Status

Authentication uses Supabase Auth.

Current flow:
- User signs in
- Auth state is loaded in lib/auth-context.tsx
- User profile is fetched from Supabase
- The app redirects authenticated users to the protected app shell

Authorization is currently enforced in the UI layer through role-based navigation and route access patterns.

---

# Known Gaps and Technical Debt

- Some business logic still needs to be moved out of page components
- Employee and role permissions can be made more robust
- More typed domain models and reusable service helpers would improve maintainability
- The docs should be updated whenever major features are added or changed
- Better error handling
- Loading states
- Performance optimization

These improvements should be made gradually.

---

# Coding Priorities

When implementing new features:

1. Reuse existing components.
2. Reuse existing services.
3. Avoid duplicate code.
4. Keep files focused.
5. Keep business logic separate from UI.
6. Maintain TypeScript safety.
7. Preserve existing behavior.

---

# Current Sprint

Sprint Goal

Deliver a stable HR foundation.

Tasks

- Improve Dashboard
- Complete Employee Module
- Build Attendance
- Build Leave Management
- Improve Authentication
- Improve Role Permissions

---

# Blockers

Update this section whenever issues arise.

Example:

- Awaiting database schema approval
- Attendance workflow under review
- Pending UI redesign

---

# Notes for AI Agents

Before writing code:

1. Read AGENT.md.
2. Read PROJECT.md.
3. Read CONTEXT.md.
4. Inspect the existing implementation.
5. Explain the planned changes before making them.
6. Preserve working functionality.
7. Update documentation if architecture changes.
8. Update this file whenever a major feature is completed.

Never assume a feature exists—verify it in the codebase first.

---

# Change Log

## 2026-07-14

- Project migrated from Bolt.new to Visual Studio Code.
- Git repository initialized.
- AI-assisted development workflow adopted.
- AGENT.md created.
- PROJECT.md created.
- CONTEXT.md created.

Future updates should be added here whenever significant milestones are reached.