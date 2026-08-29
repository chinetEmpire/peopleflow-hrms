# CONTEXT.md

# Current Project Context

Project Name: HR Management System (HRMS) — SaaS Platform
Last Updated: July 27, 2026
Project Status: Active Development — SaaS Transformation In Progress

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
- vercel

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
- Multi-tenancy foundation (organizations table, org_id on all tables)
- Tenant context provider with subdomain detection
- Dynamic branding (org name, logo, primary color)
- Subscription & billing with plan enforcement
- Flutterwave payment integration (migrated to Paystack — see Phase 12)
- Payroll management (schedules, compensation, payslips)
- Super admin platform dashboard (orgs, users, audit logs)
- Platform payments ledger with Paystack sync, reconciliation, and real refunds
- Platform admin password resets (temp password + forced change on next login)
- Decoupled platform admins (super_admin org_id is NULL; not bound to any tenant)
- Role-based access control enforced at API, database, and UI layers
- Database triggers preventing role escalation
- Rate limiting on auth, billing, and webhook endpoints
- Input validation and mass assignment protection

---

# Features In Progress

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

Authorization is enforced at three layers:
- **API layer**: `verifyToken()`, `verifyRole()`, `verifySuperAdmin()` in all API routes
- **Database layer**: RLS policies scoped by `org_id` and role checks in database functions
- **Database triggers**: `prevent_role_escalation()` trigger blocks unauthorized role changes on `profiles`
- **UI layer**: Role-based navigation, conditional rendering, and route guards

---

# Known Gaps and Technical Debt

- Some business logic still needs to be moved out of page components
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
- ~~Improve Role Permissions~~ — Completed (Phase 11)

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
3. Read CONTEXT.md and PROCESS.md.
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

## 2026-07-25

- SaaS transformation initiated — multi-tenancy architecture
- Phase 1 Complete: Database & Multi-Tenancy Foundation
  - Created organizations table with branding fields
  - Added org_id foreign key to all 8 existing tables
  - Updated all RLS policies for org-level data isolation
  - Created default organization "VCGL ONE" for existing data
  - Updated database functions (handle_new_user, create_department, get_departments, get_current_organization)
- Phase 2 Complete: Authentication & Tenant Context
  - Created TenantProvider for subdomain detection
  - Created Next.js middleware for subdomain extraction
  - Auth context now loads organization data with profile
  - Login page and sidebar use dynamic branding
  - API routes (employees, departments) scoped to user's org_id
- Phase 3 Complete: Organization Registration & Onboarding
  - Created invitations table for member invites
  - Added registration page (/register) with multi-step form
  - Added accept-invite page (/accept-invite) for invitation flow
  - Added onboarding wizard (/onboarding) for post-registration setup
  - Added API routes for registration and invitations
  - Added invite members dialog to employee management page
  - Updated login page with "Create new organization" link
- Phase 4 Complete: Tenant-Scoped Queries & RLS
  - Audited 56 unscoped queries across 14 files — all fixed
  - Created useOrganization() hook for easy org_id access
  - All page component queries now filtered by org_id
  - All inserts/upserts now include org_id in payload
  - Library functions (audit, notifications) accept orgId parameter
  - CreatableSelect component accepts orgId prop for scoped department queries
- Phase 5 Complete: Custom Branding & UI
  - Created Supabase Storage bucket for org logos
  - Added branding settings tab (logo upload, color picker, org name)
  - Created useBranding() hook for dynamic CSS variables
  - DynamicBrandStyles component injects CSS variables at runtime
  - --primary Tailwind variable now derives from org's primary_color
- Phase 6 Complete: Subscription & Billing
  - Created plans, subscriptions, invoices tables with RLS
  - Seeded 4 plan tiers (Free, Starter, Pro, Enterprise) with pricing
  - Created lib/billing.ts with plan types, pricing helpers, subscription CRUD
  - Built billing page (current plan, usage progress, invoices)
  - Built pricing/upgrade page with plan comparison grid
  - Enforced plan limits on employee creation API (returns 403 when at limit)
  - Added Billing link to sidebar for hr_admin/super_admin
  - Payment provider integration (Stripe, Flutterwave) scaffolded, needs API keys
- Phase 7 Complete: Payroll & Attendance
  - Created work_schedules, employee_compensation, payroll_runs, payslips tables
  - Created lib/payroll.ts with schedule CRUD, compensation, payroll runs, payslip generation
  - Built payroll dashboard page (stats, latest run, history)
  - Built payroll run creation page with auto payslip generation from attendance
  - Built payroll run detail page (payslips table, approve/mark paid workflow)
  - Fixed attendance late status to use configurable work schedule (start time + grace period)
  - Added Work Schedule and Compensation tabs to Settings page
  - Added Payroll link to sidebar for hr_admin/super_admin
- Phase 8 Complete: Super Admin Dashboard
  - Created admin layout with role-gated sidebar (super_admin only)
  - Built platform overview dashboard (org stats, user stats, plan distribution, recent signups)
  - Built organization management page (list all orgs, search, view/edit details)
  - Built organization detail page (edit settings, view members)
  - Built cross-org user management page (search, filter by role, change roles, activate/deactivate)
  - Built platform-wide audit log viewer
  - Created admin API routes (stats, organizations, users) with super_admin verification
  - Added "Admin Panel" link to sidebar for super_admin role
- Phase 9 Complete: Flutterwave Payment Integration
  - Created Flutterwave SDK (checkout, verification, webhook signature)
  - Built checkout API route for creating payment sessions
  - Built webhook handler for processing completed payments
  - Added Flutterwave tracking columns to subscriptions and invoices
  - Built payment success/failure page for post-payment flow
  - Updated billing page to show payment gateway status
  - Integrated Flutterwave checkout in upgrade page for paid plans
- Phase 10 Complete: Security Hardening
  - Created shared lib/supabase-admin.ts (centralized service-role client + auth helpers)
  - Created lib/validation.ts (role whitelist, input validation, pick() helper)
  - Created lib/rate-limit.ts (in-memory sliding window rate limiter)
  - Fixed privilege escalation — role field validated against VALID_ROLES on all endpoints
  - Fixed mass assignment — employee update uses field whitelist (ALLOWED_UPDATE_FIELDS)
  - Fixed webhook signature — fail-closed when secret missing + constant-time comparison
  - Sanitized all error messages — catch blocks return generic strings, log raw errors server-side
  - Fixed registration — super_admin/hr_admin not assignable via self-registration
  - Added input validation on plan, max_employees, amount, trial_days, invoice status, passwords
  - Added rate limiting on auth, billing, and webhook endpoints
  - Removed ssl: { rejectUnauthorized: false } from departments route
  - Deduplicated 13 Supabase admin client singletons into shared module
- Progress tracked in PROCESS.md

## 2026-07-27

- Phase 11 Complete: Critical Privilege Escalation Fix
  - Fixed 6 independent privilege escalation vectors that allowed tenant users to gain super_admin access
  - Registration endpoint now hardcodes role to `hr_admin` (previously accepted any role from request body)
  - `handle_new_user()` trigger now whitelists roles (employee, manager, hr_admin only; super_admin blocked)
  - New `prevent_role_escalation()` database trigger blocks unauthorized role changes on `profiles`
  - Edge function (`manage-employee`) now validates roles like the API route
  - Settings page no longer sends `role` directly to Supabase client (removed from client-side update)
  - `create_organization_with_admin()` function changed to assign `hr_admin` instead of `super_admin`
  - Downgraded improperly elevated tenant account from super_admin to hr_admin

## 2026-08-29

- Phase: Pricing Rework — 3 Naira Tiers
  - Reduced plans to Free (₦0), Starter (₦8,500/mo, ₦100,000/yr), Professional (₦21,500/mo, ₦250,000/yr)
  - Removed Enterprise; existing enterprise subscriptions/orgs rebased to Professional
  - Added yearly savings badges, tightened plan validation (VALID_PLANS) and organizations CHECK
  - Updated landing, upgrade, billing, and admin pages to the 3-tier model
- Phase: Pay-before-use Registration
  - Registration now accepts plan + billing_cycle and creates a `pending` subscription for paid plans
  - Paid-plan accounts stay locked until payment clears (check_subscription_active gates employee creation)
  - Register page gained a plan-selection step; free plans go straight to /onboarding
  - App shell + billing page show an "awaiting payment" banner with Pay Now CTA
- Phase 12: Paystack Payment Integration (replaces Flutterwave)
  - Created lib/paystack.ts SDK (checkout/initialize, verification, webhook signature, isConfigured)
  - Swapped checkout API to Paystack (amounts in kobo, callback URL built server-side from BASE_URL)
  - Rewrote webhook handler for `charge.success` with x-paystack-signature (HMAC SHA512, fail-closed)
  - Added paystack_reference / paystack_customer_id tracking columns; payment_provider CHECK extended to 'paystack'
  - Billing success page reads Paystack's `reference`/`trxref` redirect params
  - Removed lib/flutterwave.ts; Flutterwave env keys no longer used
  - PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY / PAYSTACK_WEBHOOK_SECRET documented in .env.example
  - Dev fallback: paid plans auto-activate without payment until Paystack keys are configured
- Phase 13 Complete: Platform Admin Console (Payments, Reconciliation & Admin Resets)
  - Migration `20260829160000_add_platform_admin_ops.sql`: `payments` ledger, `password_resets`, invoices refund columns, `profiles.must_change_password`, decoupled super_admin (org_id NULL via CHECK), nullable audit_logs.org_id, super_admin-only RLS on new tables
  - lib/paystack.ts extended: listPaystackTransactions, refundPaystackTransaction, isPaystackConfigured
  - New lib/platform-payments.ts: recordPayment (idempotent upsert), recordRefund, findPaymentByRefund, autoMatchPayment
  - Webhook now records every confirmed payment into the ledger and applies refund.processing/pending/success/failed events; manual refunds also synced to the ledger and linked invoices
  - New admin APIs (all super_admin-gated + rate-limited): payments list/summary/PATCH, payments/sync (Paystack paginated pull, ≤90-day window), payments/reconcile, payments/refund (confirmed + note + partial amounts), users/reset-password (blocks resets of other super_admins), change-password (self-service, clears forced flag)
  - Admin UI: Payments ledger page, payment detail (match/ignore/unlink + refund panel + refund history), Reconciliation dashboard, Reset Password with one-time temp password dialog; admin sidebar now includes Payments + Reconciliation; "Back to HR Dashboard" hidden for org-less admins
  - Platform overview page shows collected/refunded/pending/reconciled KPIs; audit log viewer gained action filter + pagination
  - Forced password change: org-less super_admin redirected from app shell to /admin; must_change_password users redirected to /change-password on login
  - Added /forgot-password page (was linked from login but did not exist)
  - Security: temp passwords never stored/logged (only issuance audited), cross-org invoice linking blocked on reconcile, refunds require explicit confirm + reason, idempotent webhook upserts