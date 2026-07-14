# CONTEXT.md

# Current Project Context

Project Name: HR Management System (HRMS)

Last Updated: July 14, 2026

Project Status: Active Development

---

# Purpose

This document provides AI coding agents with the current state of the project.

Unlike PROJECT.md (which describes the product vision) and AGENT.md (which defines engineering standards), this file describes what currently exists in the codebase.

Read this file before making any code changes.

---

# Project Summary

This project was initially scaffolded using Bolt.new and is now being developed and maintained in Visual Studio Code.

The goal is to evolve the generated code into a production-grade HR Management SaaS while preserving existing functionality and improving architecture over time.

Refactor incrementally. Do not rewrite working modules unless necessary.

---

# Current Tech Stack

Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

Deployment
- Vercel

Repository
- GitHub

Development
- Visual Studio Code

AI Assistants
- ChatGPT
- Codex
- Claude Code
- GitHub Copilot (optional)

---

# Current Application State

The application was generated using Bolt.new.

Existing code should be treated as the starting point.

Before modifying any feature:

- Understand the existing implementation.
- Preserve working functionality.
- Refactor only when beneficial.
- Avoid unnecessary rewrites.

---

# Implemented Features

The following are believed to be available (verify against the codebase):

- Authentication
- Application layout
- Navigation
- Dashboard UI
- Initial employee pages
- Supabase integration
- Basic routing
- Shared UI components

Whenever a feature is completed, update this section.

---

# Features In Progress

Current priorities:

- Employee Management
- Dashboard improvements
- Role-based access
- Attendance Module
- Leave Management

---

# Planned Features

- Departments
- Designations
- Payroll
- Recruitment
- Performance Reviews
- Reports
- Notifications
- Company Settings

---

# Future Features

- AI HR Assistant
- Resume Screening
- Employee Chat
- HR Analytics
- Multi-company support
- Mobile application
- Public API

---

# Folder Structure

Expected structure:

app/
components/
features/
hooks/
lib/
services/
types/
supabase/
middleware/
public/
docs/

If the current structure differs, improve it gradually rather than performing a large rewrite.

---

# Design System

Theme

- Clean
- Modern
- Corporate
- Minimal

UI Library

- shadcn/ui

Icons

- Lucide React

Styling

- Tailwind CSS

Responsive

- Mobile
- Tablet
- Desktop

---

# Database Status

Supabase is the primary backend.

Expected entities include:

- users
- employees
- attendance
- leave_requests
- departments
- designations
- payroll
- announcements
- holidays
- audit_logs

When modifying the database:

- Preserve existing data where possible.
- Generate SQL migrations.
- Update TypeScript types.
- Respect Row Level Security (RLS).

---

# Authentication Status

Authentication uses Supabase Auth.

Expected flow:

Login

↓

Load User

↓

Load Employee Profile

↓

Determine Role

↓

Load Permissions

↓

Redirect to Appropriate Dashboard

Authorization must always be enforced on the server.

---

# Known Technical Debt

The project originated from Bolt.new.

Possible improvements include:

- Better folder organization
- Separation of UI and business logic
- Stronger typing
- Reusable components
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