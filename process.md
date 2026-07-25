# PROCESS.md

# Development Progress Tracker

Project: HR Management System (HRMS)
Last Updated: July 25, 2026
Status: Active Development

---

# Current Sprint

Sprint Goal: Deliver a stable HR foundation.

| Task | Status | Notes |
|------|--------|-------|
| Authentication system | Done | Supabase Auth, session persistence, profile loading |
| Dashboard | Done | Live data, check-in/out, stats, leave balances |
| Employee module | Done | Full CRUD with auth user creation, audit logging |
| Attendance module | Done | Check-in/out with GPS, live timer, team view, history |
| Leave management | Done | Leave types, balances, approval workflow, audit logging |
| Reports module | Done | Real data aggregation, CSV/XLS export |
| Super admin role parity | Done | Super admin now has full access to all HR admin modules |

---

# Feature Completion

## Authentication

- [x] Login form with email/password
- [x] Session persistence via Supabase Auth
- [x] User profile fetch from `profiles` table
- [x] Role-based redirect after login
- [x] Sign out with redirect to login
- [x] Auto-create profile on new user signup (database trigger)

## Dashboard

- [x] Clock in/out card with live status
- [x] Live duration timer (1s interval)
- [x] Total employees stat (HR/admin only)
- [x] Present today stat (HR/admin only)
- [x] Pending leaves stat (HR/admin only)
- [x] Birthday of the month widget
- [x] My leave balances with progress bars
- [x] Recent leave requests list
- [x] My team view (manager role)
- [x] Auto-reconciliation for open attendance records
- [x] Super admin sees all HR admin dashboard features
- [ ] "On Leave Today" stat (currently hardcoded to 0)

## Employees

- [x] Employee list with search filtering
- [x] Employee cards with avatar, name, ID, role, contact info
- [x] Create employee (multi-section form with experience, education, dependents)
- [x] Edit employee via dialog
- [x] Delete employee with confirmation
- [x] Department selection and inline creation
- [x] Audit logging on create/update/delete
- [x] Backend creates real Supabase auth users
- [x] Role-based access (hr_admin, super_admin)

## Attendance

- [x] Check in with GPS coordinates
- [x] Check out with GPS coordinates
- [x] Live duration timer
- [x] Status calculation (present, late, half_day, absent)
- [x] Team attendance view (manager/HR/super_admin)
- [x] Monthly history with date navigation
- [x] Auto-reconciliation for stale records
- [x] Location display on UI
- [x] Unique constraint per employee per day

## Time Off / Leave

- [x] Leave types (Annual, Sick, Emergency, Maternity, Paternity, Unpaid)
- [x] Leave balances with remaining/used/pending display
- [x] Request leave with auto day calculation
- [x] My requests list with status badges
- [x] Pending approvals view (HR/super_admin)
- [x] Approve request (updates balance, logs action)
- [x] Reject request with reason (reverts balance, logs action)
- [x] RLS policies for employee-level data access

## Reports

- [x] Summary stats (team size, present, late, pending leaves)
- [x] Per-employee attendance breakdown with rate percentage
- [x] Monthly trend chart (last 6 months)
- [x] Leave summary (approved, pending, rejected)
- [x] CSV export for attendance and leave
- [x] XLS export for attendance and leave
- [x] Role-scoped data (manager sees team, HR/super_admin sees all)

## Settings

- [x] Profile editing (name, nickname, phone, job title)
- [x] Leave type CRUD (add, edit, delete with confirmation)
- [x] Leave balance customization per employee per year
- [x] Action logging on leave type changes
- [x] Super admin has full settings access including leave types and balances

## Security

- [x] Audit log viewer with up to 200 entries
- [x] Summary stats (total, creates, deletes)
- [x] Search/filter by action, entity, actor, email
- [x] Immutable log table (no update/delete via RLS)
- [x] Super admin role restriction

---

# Known Issues & Gaps

- "On Leave Today" stat on dashboard is hardcoded to 0 — query not yet implemented
- Edge function `manage-employee` duplicates the API route logic — could be consolidated
- Department management uses direct PostgreSQL (`pg` Pool) instead of Supabase client
- `CreatableSelect` component was added to work around PostgREST schema cache issue
- Business logic could be further extracted from page components into service helpers
- Error handling and loading states could be improved across modules

---

# Dev Log

## 2026-07-13

- Project initialized with Next.js 15, Supabase, Tailwind, shadcn/ui
- 7 Supabase migrations created covering all core tables and RLS policies
- Authentication system implemented (login, session, profile)
- Dashboard built with live data from Supabase
- Employee module with full CRUD and edge function backend
- Attendance module with check-in/out and GPS
- Leave management with types, balances, and approval workflow
- Reports module with data aggregation and export
- Settings and Security pages implemented

## 2026-07-14

- Extended profile fields added (gender, DOB, marital status, nationality, address, emergency contacts, bank info, employment details)
- Work experience, education, and dependent details added as JSONB fields
- Attendance GPS location fields added (check-in/out lat/lng)
- Project migrated from Bolt.new to Visual Studio Code
- Git repository initialized
- AGENT.md, PROJECT.md, CONTEXT.md created
- AI-assisted development workflow adopted

## 2026-07-23

- Departments feature started
- `departments` table created with RLS policies

## 2026-07-24

- Fixed departments RLS grants
- Created `get_departments()` and `create_department()` RPC functions
- Added departments API route using direct PostgreSQL connection
- Added departments edge function
- Added `CreatableSelect` component for department selection

## 2026-07-25

- Created process.md to track development progress
- Extended super admin role to have full access to all HR admin modules
- Updated sidebar navigation to show all modules for super_admin
- Updated page-level role checks in attendance, time-off, reports, dashboard, settings
- Cleaned up redundant `isSuperAdmin` checks in dashboard
- Audit log (Security) remains super_admin-only as intended

---

# How to Update This File

- **Sprint tasks**: Update status (Done / In Progress / Todo / Blocked) as work progresses
- **Feature checklist**: Check or uncheck items as features are completed or modified
- **Known issues**: Add new issues as they are discovered, remove when resolved
- **Dev log**: Add a dated entry whenever a meaningful feature is completed or changed
- **Format**: Keep entries concise and action-oriented
