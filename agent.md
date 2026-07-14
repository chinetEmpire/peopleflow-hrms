
# PROJECT.md

# HR Management System

## Vision

Build a modern Human Resource Management platform for organizations of all sizes.

The system should automate HR operations while remaining simple, secure, scalable and AI-ready.

---

# Project Goals

The application manages the complete employee lifecycle.

Major objectives:

- Employee Management
- Attendance
- Leave Management
- Reports
- Company Communication
- HR Analytics

---

# User Roles

## Employee

Features

- Login
- Dashboard
- Update Profile
- Attendance
- Leave Requests
- Leave Balance
- Announcements
- Company Policies

---

## Manager

Everything an Employee can do plus:

- Team Dashboard
- Team Attendance
- Team leave
- Team Reports

---

## HR Administrator

Features

- Employee Management
- Departments
- Designations
- Leave Management
- Holidays
- Reports
- HR Analytics

---

## Super Admin

Full system access.

Responsible for:
- all hr features
- Companies
- Roles
- Permissions
- Integrations
- Billing
- Security
- Audit Logs
- System Settings

---

# Core Modules

Authentication

Dashboard

Employees

Attendance

Leave

Departments

Designations

Announcements

Documents

Reports

Notifications

Settings

Audit Logs

---

# Current Status

In Progress


- Authentication
- Base Layout
- Routing
- Initial UI
- Supabase Connection
- Dashboard
- Employee Module

Planned

- Attendance
- Leave
- Departments
- Reports

Future

- Payroll
- Recruitment
- AI Assistant
- Multi-company Support

---

# Business Rules

Attendance

- One Check-In per day.
- Check-Out requires Check-In.
- Attendance timestamps stored in GMT.
- check-in below 8 hours is considered half day, after 24 hours if the user does not check out the system check the person out and record absent.


Leave

- Leave balance must be validated.
- Approval workflow follows company policy.

Employees

- Email addresses are unique.
- Employee IDs are unique.
- Historical records should be preserved.

---

# Future AI Features

- AI HR Assistant
- Resume Screening
- Employee Chatbot
- HR Analytics Assistant
- Policy Assistant

---

# Project Folder Structure

main the one we have for now

---

# Future Integrations

- Microsoft 365
- Google Workspace
- Slack
- Teams
- Paystack
- Flutterwave
- Resend
- Twilio

---

# Development Priorities

Priority 1

Authentication

Employees

Dashboard

Attendance

Priority 2

Leave

Departments

Designations

Reports

Priority 3

Payroll

Recruitment

Performance

Priority 4

AI Features

Mobile App

Public API

Multi-company

---

# Success Criteria

The system should be:

- Secure
- Fast
- Responsive
- Accessible
- Production-ready
- Easy to maintain
- Easy to extend

Every new feature should fit naturally into the existing architecture.