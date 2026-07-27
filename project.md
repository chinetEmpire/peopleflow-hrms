# PROJECT.md

# HR Management System

## Vision

Build a modern human resource management platform that helps organizations manage employees, attendance, time-off, and core HR workflows with a clean, secure, and scalable experience.

The system should remain simple to use while being ready for future growth, additional modules, and integrations.

---

# Product Goals

The current product scope focuses on the core employee lifecycle and HR administration experience.

## Core Objectives

- Employee management
- Attendance tracking
- Time-off / leave requests
- Reports and HR administration views
- Secure role-based access
- A modern internal dashboard experience

---

# User Roles

## Employee

Features include:
- Login
- Dashboard access
- Attendance view
- Time-off requests
- Profile-related access
- Basic settings access

## Manager

Includes employee capabilities plus:
- Manager-level dashboard access
- Team-related views
- Reporting access

## HR Administrator

Includes manager capabilities plus:
- Employee administration
- HR-focused dashboard views
- User management workflows
- Reports and policy-related access

## Super Admin

Full platform access for cross-organization administration. This role can only be assigned by an existing super_admin — it cannot be self-assigned or promoted to via any other role.

---

# Current Modules

The application currently includes:

- Authentication
- Dashboard
- Employees
- Attendance
- Time Off
- Reports
- Settings
- Security

---

# Current Status

## Implemented

- Authentication and protected routing
- Dashboard shell and app layout
- Employee management UI
- Attendance page
- Time-off page
- Reports page
- Settings page
- Security page
- Supabase-backed employee management flow
- Role-based access control (API, database, and UI layers)
- Security hardening (rate limiting, input validation, privilege escalation prevention)

## In Progress

- More complete leave workflow behavior
- Reporting enhancement
- Better employee data validation and UX

## Planned

- Departments and designations
- Payroll
- Recruitment
- Performance reviews
- Notifications and announcements
- Audit and compliance improvements
- AI assistant features
- Multi-company support

---

# Business Rules

## Attendance

- Attendance is tracked as part of the HR workflow
- The system should support one check-in experience per day
- Check-out should remain dependent on prior check-in

## Leave / Time Off

- Leave requests should be validated before processing
- Approval flow should follow the organization’s policy

## Employees

- Email addresses should be unique
- Employee IDs should be unique
- Historical records should be preserved

---

# Project Structure

The app currently follows this structure:

- app/
- app/(app)/
- components/
- components/ui/
- hooks/
- lib/
- supabase/
- public/

---

# Development Priorities

## Priority 1

- Authentication reliability
- Employee management
- Dashboard usability
- Attendance workflow

## Priority 2

- Leave and time-off improvements
- Reporting improvements
- Settings and security refinements

## Priority 3

- Departments and designations
- Payroll
- Recruitment

## Priority 4

- AI features
- Multi-company support
- Public API and broader integrations

---

# Success Criteria

The system should be:

- Secure
- Fast
- Responsive
- Accessible
- Easy to maintain
- Easy to extend