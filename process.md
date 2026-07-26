# SaaS Transformation — Progress Tracker

## Project: HR Management System → Multi-Tenant SaaS Platform
## Started: July 25, 2026

---

## Completed Phases

### Phase 1: Database & Multi-Tenancy Foundation ✅

**Migration:** `supabase/migrations/20260725300000_add_multi_tenancy.sql`

- Created `organizations` table (id, name, slug, logo_url, primary_color, plan, max_employees)
- Added `org_id` UUID foreign key to all 8 tables:
  - profiles, departments, leave_types, leave_balances, leave_requests, attendance_records, audit_logs, notifications
- Created default organization "VCGL ONE" (`00000000-0000-0000-0000-000000000001`) for existing data
- Updated RLS policies on all tables — org-scoped with super_admin bypass
- Updated database functions:
  - `handle_new_user()` — accepts org_id from user metadata
  - `create_department(name, org_id)` — scoped to org
  - `get_departments()` — filters by user's org
  - `get_new function()` — returns current user's organization
- Added performance indexes on all org_id columns
- Updated unique constraints to include org_id (departments, leave_types, attendance, leave_balances)

**TypeScript:**
- `lib/supabase.ts` — Added `Organization` interface, `org_id` to all interfaces
- `lib/organizations.ts` — Created organization service (CRUD, slug detection, URL builders)

---

### Phase 2: Authentication & Tenant Context ✅

**New Files:**
- `lib/tenant-context.tsx` — TenantProvider detects org from subdomain or cookie, loads org data
- `middleware.ts` — Next.js middleware extracts subdomain, stores `org_slug` cookie

**Modified Files:**
- `lib/auth-context.tsx` — Profile query joins `organization` table, exposes `organization` in context
- `app/layout.tsx` — Wrapped with `<TenantProvider>`, removed hardcoded "VCGL ONE" branding
- `app/page.tsx` — Org-aware redirect logic (subdomain → login/dashboard)
- `app/login/page.tsx` — Dynamic branding (org name, logo, primary color)
- `app/(app)/layout.tsx` — Sidebar + header use org name, logo, primary color
- `app/api/employees/route.ts` — All CRUD scoped to user's org_id, audit logs include org_id
- `app/api/departments/route.ts` — Added auth, GET/POST scoped to user's org_id

**How tenant detection works:**
1. Production: `acme.hrapp.com` → middleware sets `org_slug` cookie → TenantProvider fetches org by slug
2. Development: `localhost` → falls back to profile's `org_id` via RPC `get_current_organization()`

---

## Pending Phases

### Phase 3: Organization Registration & Onboarding ✅

**Migration:** `supabase/migrations/20260725400000_add_invitations_and_registration.sql`

- Created `invitations` table (id, org_id, email, role, invited_by, token, status, expires_at)
- RLS policies for invitation management (org-scoped)
- Database functions:
  - `create_organization_with_admin()` — creates org + admin user in one transaction
  - `invite_member()` — generates invitation token with expiry
  - `accept_invite()` — validates token and links user to org
  - `get_pending_invitations()` — lists pending invites for org

**New Files:**
- `app/register/page.tsx` — Multi-step registration form (org details → admin account)
- `app/accept-invite/page.tsx` — Invitation acceptance page with password setup
- `app/onboarding/page.tsx` — Post-registration wizard (departments, leave types, invite team)
- `app/api/register/route.ts` — API route for org + admin creation
- `app/api/invitations/route.ts` — API route for invite CRUD operations
- `lib/invitations.ts` — Invitation service functions
- `components/invite-members-dialog.tsx` — Reusable invite dialog component

**Modified Files:**
- `lib/supabase.ts` — Added `Invitation` interface
- `app/login/page.tsx` — Added "Create new organization" link
- `app/(app)/employees/page.tsx` — Added "Invite member" button + dialog integration

### Phase 4: Tenant-Scoped Queries & RLS ✅

**Audit Result:** 56 unscoped queries found across 14 files — all fixed.

**New Files:**
- `hooks/use-organization.ts` — `useOrganization()` hook for easy org_id access

**Fixed Files (org_id scoping added):**
- `app/(app)/employees/page.tsx` — profiles query now filtered by org_id
- `app/(app)/employees/new/page.tsx` — managers list + edit query scoped to org
- `app/(app)/dashboard/page.tsx` — all 12 queries scoped (attendance, leaves, profiles, stats)
- `app/(app)/attendance/page.tsx` — my records + team records + check-in/upsert scoped
- `app/(app)/time-off/page.tsx` — leave_types, leave_requests, leave_balances all scoped
- `app/(app)/settings/page.tsx` — leave_types, profiles, leave_balances queries + inserts scoped
- `app/(app)/reports/page.tsx` — all attendance + leave + profiles queries scoped
- `app/(app)/security/page.tsx` — audit_logs query scoped to org

**Fixed Library Files:**
- `lib/audit.ts` — `logAction()` now accepts optional `orgId` parameter
- `lib/notifications.ts` — `createNotification()` and `getNotifications()` accept optional `orgId`
- `components/creatable-select.tsx` — accepts `orgId` prop, queries scoped to org

**Key Changes:**
- All SELECT queries now include `.eq('org_id', profile.org_id)`
- All INSERT/UPSERT operations now include `org_id: profile.org_id` in the payload
- All COUNT queries now include `.eq('org_id', profile.org_id)`
- Components that need org_id accept it as a prop or derive it from `useAuth()`

### Phase 5: Custom Branding & UI ✅

**Migration:** `supabase/migrations/20260725500000_add_logo_storage.sql`

- Created Supabase Storage bucket `org-logos` (public read, authenticated write)
- RLS policies for logo upload/delete

**New Files:**
- `hooks/use-branding.ts` — `useBranding()` hook: provides primary color, CSS variables, org name/logo
- `components/branding-tab.tsx` — Branding settings tab (logo upload, color picker, org name)
- `components/dynamic-brand-styles.tsx` — Injects dynamic CSS variables from org's primary color

**Modified Files:**
- `app/layout.tsx` — Added `<DynamicBrandStyles />` for runtime CSS variable injection
- `app/globals.css` — `--primary` and `--ring` now reference `--brand-primary-hsl` (dynamic)
- `app/(app)/settings/page.tsx` — Added "Branding" tab (HR admin only)

**Branding Features:**
- Logo upload to Supabase Storage (2MB max, public URL)
- Primary color picker with 16 presets + custom hex input
- Live preview of color changes
- Dynamic CSS variables (`--brand-primary`, `--brand-primary-hsl`, etc.) injected at runtime
- `--primary` Tailwind variable now derives from org's primary color

### Phase 6: Subscription & Billing ✅

**Migration:** `supabase/migrations/20260725600000_add_billing_subscriptions.sql`

- Created `plans` table with 4 tiers (Free, Starter, Professional, Enterprise)
- Created `subscriptions` table with status, billing cycle, periods
- Created `invoices` table for payment history
- Added `billing_email` and `subscription_id` to organizations
- RLS policies: plans public read, subscriptions/invoices org-scoped
- Seeded default plans with pricing and feature lists
- Created `get_current_subscription()` and `get_org_usage()` RPC functions

**New Files:**
- `lib/billing.ts` — Plan types, pricing helpers, subscription CRUD, usage checks
- `app/(app)/billing/page.tsx` — Billing page (current plan, usage, invoices)
- `app/(app)/billing/upgrade/page.tsx` — Pricing page with plan comparison

**Modified Files:**
- `app/api/employees/route.ts` — Added plan limits enforcement on employee creation
- `app/(app)/layout.tsx` — Added "Billing" link to sidebar (hr_admin, super_admin)

**Plan Limits Enforcement:**
- Employee creation API now checks `max_employees` before allowing new users
- Returns 403 with `limitReached: true` and plan upgrade guidance
- `canAddEmployee()` function exists but enforcement is now also in the API layer

**Pricing Tiers:**
| Plan | Monthly | Yearly | Max Employees | Max Departments |
|------|---------|--------|---------------|-----------------|
| Free | $0 | $0 | 10 | 3 |
| Starter | $29 | $290 | 50 | 10 |
| Professional | $79 | $790 | 200 | 50 |
| Enterprise | $199 | $1,990 | Unlimited | Unlimited |

**Note:** Payment provider integration (Stripe, Flutterwave) is scaffolded but requires API keys and webhook configuration to go live.

### Phase 7: Payroll & Attendance ✅

**Migration:** `supabase/migrations/20260725700000_add_work_schedules_and_payroll.sql`

- Created `work_schedules` table with configurable start/end time, grace period, work hours
- Created `employee_compensation` table (base salary, currency, pay frequency)
- Created `payroll_runs` table (batch payroll processing)
- Created `payslips` table (individual payslip records)
- RLS policies: schedules org-scoped, compensation hr-managed, payslips employee-visible
- Seeded default work schedules for existing orgs

**New Files:**
- `lib/payroll.ts` — Work schedule CRUD, compensation management, payroll run CRUD, payslip generation
- `app/(app)/payroll/page.tsx` — Payroll dashboard (stats, latest run, history)
- `app/(app)/payroll/runs/new/page.tsx` — Create new payroll run with auto payslip generation
- `app/(app)/payroll/runs/[id]/page.tsx` — Payroll run detail (payslips table, approve/mark paid)

**Modified Files:**
- `lib/utils.ts` — `attendanceStatusFromDuration()` now accepts work schedule params
- `app/(app)/attendance/page.tsx` — Loads work schedule, uses configurable late status
- `app/(app)/settings/page.tsx` — Added Work Schedule and Compensation tabs
- `app/(app)/layout.tsx` — Added "Payroll" link to sidebar (hr_admin, super_admin)
- `lib/supabase.ts` — Added PayrollRun, Payslip, WorkSchedule, EmployeeCompensation types

### Phase 8: Super Admin Dashboard ✅

**New Files:**
- `app/(admin)/layout.tsx` — Admin-specific layout with role-gated sidebar (super_admin only)
- `app/(admin)/page.tsx` — Platform overview dashboard (org stats, user stats, plan distribution, recent signups)
- `app/(admin)/organizations/page.tsx` — Organization listing with search, user/dept counts, plan badges
- `app/(admin)/organizations/[id]/page.tsx` — Organization detail (edit name/plan/limits, view members)
- `app/(admin)/users/page.tsx` — Cross-org user management (search, filter by role, change role, activate/deactivate)
- `app/(admin)/audit/page.tsx` — Platform-wide audit log viewer (all orgs, all actions)
- `lib/admin.ts` — Admin service functions (platform stats, org CRUD, user management)
- `app/api/admin/stats/route.ts` — Platform statistics API (org/user/dept counts, plan breakdown)
- `app/api/admin/organizations/route.ts` — Organizations API (list with counts, update org settings)
- `app/api/admin/users/route.ts` — Users API (list with pagination/filtering, update role/status)

**Modified Files:**
- `app/(app)/layout.tsx` — Added "Admin Panel" link to sidebar (super_admin only)

**Admin Dashboard Features:**
- **Platform Overview:** Total orgs, users, active users, departments, plan distribution, recent signups, platform health metrics
- **Organization Management:** List all orgs with search, view/edit org settings (name, plan, max employees), view member list
- **User Management:** Cross-org user listing with pagination, search by name/email, filter by role, change user roles, activate/deactivate users
- **Audit Logs:** Platform-wide audit trail across all organizations, filterable by action/entity/actor

**Access Control:**
- Admin layout enforces `super_admin` role — redirects non-super-admins to `/dashboard`
- All admin API routes verify super_admin role via Bearer token
- Admin Panel link only visible in sidebar for super_admin role

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Tenant access | Subdomain (acme.hrapp.com) |
| Registration | Self-service signup |
| Billing model | Free tier + paid plans |
| Branding | Logo + colors only |
| Scale target | 10-50 organizations |
| Default org UUID | `00000000-0000-0000-0000-000000000001` |
| super_admin | Bypasses all org restrictions (platform admin) |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260725300000_add_multi_tenancy.sql` | Multi-tenancy migration |
| `supabase/migrations/20260725400000_add_invitations_and_registration.sql` | Invitations & registration migration |
| `supabase/migrations/20260725500000_add_logo_storage.sql` | Logo storage bucket migration |
| `supabase/migrations/20260725600000_add_billing_subscriptions.sql` | Billing & subscriptions migration |
| `supabase/migrations/20260725700000_add_work_schedules_and_payroll.sql` | Work schedules & payroll migration |
| `lib/supabase.ts` | All TypeScript types (Organization, Profile, Invitation, etc.) |
| `lib/organizations.ts` | Organization service functions |
| `lib/invitations.ts` | Invitation service functions |
| `hooks/use-organization.ts` | useOrganization() hook for org_id access |
| `lib/tenant-context.tsx` | Tenant context provider |
| `lib/auth-context.tsx` | Auth context (includes organization) |
| `middleware.ts` | Subdomain detection middleware |
| `app/layout.tsx` | Root layout (AuthProvider + TenantProvider) |
| `app/(app)/layout.tsx` | Dashboard layout (dynamic branding) |
| `app/login/page.tsx` | Login page (dynamic branding) |
| `app/register/page.tsx` | Registration page (multi-step form) |
| `app/accept-invite/page.tsx` | Invitation acceptance page |
| `app/onboarding/page.tsx` | Post-registration onboarding wizard |
| `app/api/register/route.ts` | Registration API route |
| `app/api/invitations/route.ts` | Invitations API route |
| `components/invite-members-dialog.tsx` | Reusable invite dialog component |
| `components/branding-tab.tsx` | Branding settings tab (logo, color, name) |
| `components/dynamic-brand-styles.tsx` | Runtime CSS variable injection |
| `hooks/use-branding.ts` | useBranding() hook for dynamic colors |
| `supabase/migrations/20260725600000_add_billing_subscriptions.sql` | Billing & subscriptions migration |
| `lib/billing.ts` | Billing service, plan types, subscription CRUD |
| `app/(app)/billing/page.tsx` | Billing page (current plan, usage, invoices) |
| `app/(app)/billing/upgrade/page.tsx` | Pricing page with plan comparison |
| `app/api/employees/route.ts` | Employee API (org-scoped, plan limits enforced) |
| `app/api/departments/route.ts` | Department API (org-scoped) |
| `lib/payroll.ts` | Payroll service, schedule CRUD, payslip generation |
| `app/(app)/payroll/page.tsx` | Payroll dashboard |
| `app/(app)/payroll/runs/new/page.tsx` | Create payroll run page |
| `app/(app)/payroll/runs/[id]/page.tsx` | Payroll run detail page |

---

## Notes

- All existing data assigned to default org "VCGL ONE"
- RLS policies enforce org isolation at database level
- super_admin role has cross-org access for platform management
- Tenant context works in both development (cookie) and production (subdomain)
