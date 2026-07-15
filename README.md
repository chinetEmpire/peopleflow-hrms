# VCGL ONE HR Management System

A modern HR management application built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase. The project currently focuses on authentication, a protected dashboard experience, employee management, attendance, time-off, reports, settings, and security-related views.

## Current scope

Implemented or actively being developed:

- Authentication and protected routing
- Dashboard shell and navigation
- Employee management
- Attendance page
- Time-off / leave page
- Reports page
- Settings page
- Security page for admin access

## Tech stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth + PostgreSQL

## Quick start

1. Install dependencies
   ```bash
   npm install
   ```

2. Create a local environment file with your Supabase values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the app locally
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Available scripts

- `npm run dev` – start the local development server
- `npm run build` – create a production build
- `npm run start` – run the production build locally
- `npm run typecheck` – run TypeScript checks

## Project documentation

- [project.md](project.md) – product vision and roadmap
- [context.md](context.md) – current implementation status and architecture notes
- [agent.md](agent.md) – engineering guidance for AI coding agents
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) – Supabase configuration steps

## Notes

The app has been verified locally with a successful production build using `npm run build`.
