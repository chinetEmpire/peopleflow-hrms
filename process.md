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
| Notifications system | Done | Bell, real-time, attendance reminders, leave alerts |
| Mobile responsiveness | Done | Viewport meta, scrollable tabs, responsive dialogs |
| Location address names | Done | Reverse geocoding, human-readable addresses |

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
- [x] Location address display (human-readable, not coordinates)
- [ ] "On Leave Today" stat (currently hardcoded to 0)

## Employees

- [x] Employee list with search filtering
- [x] Employee cards with avatar, name, ID, role, contact info
- [x] Create employee (multi-section form with experience, education, dependents)
- [x] Edit employee via dedicated form page (`/employees/new?id=`)
- [x] Delete employee with confirmation
- [x] Department selection and inline creation
- [x] Audit logging on create/update/delete
- [x] Backend creates real Supabase auth users
- [x] Role-based access (hr_admin, super_admin)
- [x] Card/table view toggle (HR/super_admin only)
- [x] Profile picture display on cards and table

## Attendance

- [x] Check in with GPS coordinates
- [x] Check out with GPS coordinates
- [x] Live duration timer
- [x] Status calculation (present, late, half_day, absent)
- [x] Team attendance view (manager/HR/super_admin)
- [x] Monthly history with date navigation
- [x] Auto-reconciliation for stale records
- [x] Location display on UI (human-readable addresses via OpenStreetMap)
- [x] Unique constraint per employee per day
- [x] Reverse geocoding for check-in/out locations

## Time Off / Leave

- [x] Leave types (Annual, Sick, Emergency, Maternity, Paternity, Unpaid)
- [x] Leave balances with remaining/used/pending display
- [x] Request leave with auto day calculation
- [x] My requests list with status badges
- [x] Pending approvals view (HR/super_admin)
- [x] Approve request (updates balance, logs action)
- [x] Reject request with reason (reverts balance, logs action)
- [x] RLS policies for employee-level data access
- [x] Auto-notification on leave approval/rejection (database trigger)

## Reports

- [x] Summary stats (team size, present, late, pending leaves)
- [x] Per-employee attendance breakdown with rate percentage
- [x] Monthly trend chart (last 6 months)
- [x] Leave summary (approved, pending, rejected)
- [x] CSV export for attendance and leave
- [x] XLS export for attendance and leave
- [x] Role-scoped data (manager sees team, HR/super_admin sees all)
- [x] Location address columns in export

## Settings

- [x] Profile editing (name, nickname, phone, job title)
- [x] Leave type CRUD (add, edit, delete with confirmation)
- [x] Leave balance customization per employee per year
- [x] Action logging on leave type changes
- [x] Super admin has full settings access including leave types and balances
- [x] Profile picture upload with 5MB limit
- [x] Work Experience, Education, Dependent details sections
- [x] Full profile form visible to all users (restricted fields for employees/managers)

## Security

- [x] Audit log viewer with up to 200 entries
- [x] Summary stats (total, creates, deletes)
- [x] Search/filter by action, entity, actor, email
- [x] Immutable log table (no update/delete via RLS)
- [x] Super admin role restriction

## Notifications

- [x] `notifications` table with RLS (users read/update own only)
- [x] Bell icon with red unread count badge in header
- [x] Dropdown notification panel with scrollable list
- [x] Mark individual notifications as read (click)
- [x] Mark all as read button
- [x] Delete notifications
- [x] Supabase Realtime subscription for live updates
- [x] Browser Notification API for native push
- [x] Synthesized chime sound on new notifications
- [x] Check-in reminder at 8:30 AM (only if not checked in)
- [x] Check-out reminder at 5:00 PM (only if checked in but not out)
- [x] Leave approval/rejection auto-notifications (database trigger)
- [x] Conditional reminders via localStorage deduplication
- [x] Permission request on first user interaction

## Mobile Responsiveness

- [x] Viewport meta tag with `userScalable: false`
- [x] Employees table in `overflow-x-auto` with min-width
- [x] All dialogs responsive (`w-[calc(100vw-2rem)]`)
- [x] Scrollable tab lists on mobile
- [x] Timer text scaled (`text-3xl sm:text-5xl`)
- [x] Buttons full-width on mobile (`w-full sm:w-auto`)
- [x] Settings sections stack vertically on mobile

---

# Known Issues & Gaps

- "On Leave Today" stat on dashboard is hardcoded to 0 — query not yet implemented
- Edge function `manage-employee` duplicates the API route logic — could be consolidated
- Department management uses direct PostgreSQL (`pg` Pool) instead of Supabase client
- `CreatableSelect` component was added to work around PostgREST schema cache issue
- Business logic could be further extracted from page components into service helpers
- Error handling and loading states could be improved across modules
- pg_cron not yet enabled for server-side attendance reminders (client-side fallback active)
- Browser notification permission must be granted manually (first click triggers request)

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

## 2026-07-25 (Morning)

- Created process.md to track development progress
- Extended super admin role to have full access to all HR admin modules
- Updated sidebar navigation to show all modules for super_admin
- Updated page-level role checks in attendance, time-off, reports, dashboard, settings
- Cleaned up redundant `isSuperAdmin` checks in dashboard
- Audit log (Security) remains super_admin-only as intended

## 2026-07-25 (Afternoon — Location & Employees)

- Added reverse geocoding utility (`lib/geocode.ts`) using Nominatim/OpenStreetMap API
- Created migration `20260725100000_add_attendance_location_names.sql` adding `check_in_location` and `check_out_location` text columns
- Updated `AttendanceRecord` type with location name fields
- Updated dashboard and attendance check-in/check-out handlers to fetch and store human-readable addresses
- Updated UI to display location names instead of raw coordinates
- Updated reports CSV/XLS export to include Check-in/Check-out Location columns
- Fixed employees/new page — now accepts `?id=` query param for edit mode with full form pre-filled
- Edit button on employees page navigates to `/employees/new?id=` instead of opening inline dialog
- Fixed Suspense boundary issue for `useSearchParams` in employees/new page
- Added viewport meta tag with `maximumScale: 1, userScalable: false` for mobile
- Added `overflow-x: hidden` to html/body in globals.css
- Made all dialogs responsive with `w-[calc(100vw-2rem)]`
- Added scrollable tabs on mobile for time-off and attendance pages
- Scaled timer text for mobile (`text-3xl sm:text-5xl`)
- Made buttons full-width on mobile for time-off and settings pages
- Stacked settings profile picture section vertically on mobile
- Made settings employee selector responsive (`w-full sm:w-[260px]`)

## 2026-07-25 (Evening — Notifications System)

- Created `notifications` table with RLS, indexes, and `create_notification()` RPC function
- Created database trigger `trg_leave_status_change` for automatic leave approval/rejection notifications
- Added `NotificationRecord` and `NotificationType` types to `lib/supabase.ts`
- Created `lib/notifications.ts` — CRUD service (create, fetch, mark read, mark all read, delete)
- Created `lib/push-notifications.ts` — Browser Notification API + synthesized chime sound
- Created `hooks/use-notifications.ts` — Supabase Realtime subscription with live updates
- Created `hooks/use-attendance-reminders.ts` — Client-side 8:30 AM / 5:00 PM reminders with localStorage deduplication
- Created `components/notifications/notification-bell.tsx` — Bell icon with red unread count badge
- Created `components/notifications/notification-dropdown.tsx` — Scrollable notification list with mark all as read
- Integrated notification bell into app header (`app/(app)/layout.tsx`)
- Wired attendance reminders hook into layout
- Pushed migration `20260725200000_create_notifications.sql` to Supabase
- All changes committed and pushed

---

# How to Update This File

- **Sprint tasks**: Update status (Done / In Progress / Todo / Blocked) as work progresses
- **Feature checklist**: Check or uncheck items as features are completed or modified
- **Known issues**: Add new issues as they are discovered, remove when resolved
- **Dev log**: Add a dated entry whenever a meaningful feature is completed or changed
- **Format**: Keep entries concise and action-oriented
