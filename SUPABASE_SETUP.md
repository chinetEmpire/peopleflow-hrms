# Connecting Supabase

1. In the Supabase dashboard, open your project and go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon** (or publishable) key into a new `.env.local` file based on `.env.example`.
3. Apply the SQL files in `supabase/migrations` in chronological order using the Supabase SQL Editor, or run them with the Supabase CLI linked to this project.
4. In **Authentication → URL Configuration**, add `http://localhost:3000` as a Site URL / Redirect URL for local development. Add your deployed site URL as well before production.
5. Restart `npm run dev` after changing `.env.local`.

Do not put a `service_role` key in `.env.local` with a `NEXT_PUBLIC_` prefix. The `manage-employee` Edge Function obtains its service-role key from Supabase function secrets instead.

## Verify

Run `npm run dev`, open `http://localhost:3000/login`, and sign in with an Auth user that has a matching `profiles` record. If the database has not been initialized, apply the migrations first.
